import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  VerifyOtpDto,
  ResetPasswordDto,
} from './dto';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';

type GoogleTokenInfo = {
  aud?: string;
  audience?: string;
  sub?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
};

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private cookieOptions(isProd: boolean) {
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' as const : 'lax' as const,
      path: '/',
      domain: isProd ? this.configService.get<string>('COOKIE_DOMAIN') : undefined,
    };
  }

  // Register
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // Login (email/password) — set refreshToken cookie
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: LoginDto })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'] as string | undefined;
    const ipAddress = req.ip;

    const isProd = this.configService.get('NODE_ENV') === 'production';
    const auth = await this.authService.login(loginDto, userAgent, ipAddress);
    const { tokens } = auth;

    // set refresh cookie
    res.cookie('refreshToken', tokens.refreshToken, this.cookieOptions(isProd));

    // return safe response (do not include refresh token)
    return {
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
      user: auth.user,
    };
  }

  // Google OAuth - Initiate
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {}

  // Google OAuth - Callback (set cookie + redirect)
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as {
      googleId: string;
      email: string;
      firstName?: string;
      lastName?: string;
      avatar?: string;
    };

    const { tokens } = await this.authService.googleLogin(user);
    const isProd = this.configService.get('NODE_ENV') === 'production';

    res.cookie('refreshToken', tokens.refreshToken, this.cookieOptions(isProd));
    return res.redirect(`${this.configService.get('FRONTEND_URL')}/instructor`);
  }

  // Google OAuth - Token Exchange (for token-only flows)
  @Post('google/token')
  @HttpCode(HttpStatus.OK)
  async googleToken(
    @Body() body: { idToken?: string; id_token?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const idToken = body.idToken || body.id_token;
    if (!idToken) {
      throw new BadRequestException('id_token is required');
    }

    const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(
      idToken,
    )}`;

    const resp = await fetch(tokenInfoUrl);
    if (!resp.ok) {
      throw new BadRequestException('Invalid id_token');
    }

    const info = (await resp.json()) as GoogleTokenInfo;
    const aud = info.aud ?? info.audience;
    const expected = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!expected || aud !== expected) {
      throw new BadRequestException('Invalid id_token audience');
    }

    const profile = {
      googleId: info.sub ?? '',
      email: info.email ?? '',
      firstName: info.given_name,
      lastName: info.family_name,
      avatar: info.picture,
    };

    const auth = await this.authService.googleLogin(profile);
    const isProd = this.configService.get('NODE_ENV') === 'production';

    // set refresh cookie for token-exchange flows too
    res.cookie('refreshToken', auth.tokens.refreshToken, this.cookieOptions(isProd));

    return {
      accessToken: auth.tokens.accessToken,
      expiresIn: auth.tokens.expiresIn,
      user: auth.user,
    };
  }

  // Refresh token (read cookie) -> set new cookie and return access token
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const tokens = await this.authService.refreshTokens(refreshToken);
    const isProd = this.configService.get('NODE_ENV') === 'production';

    // set new refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, this.cookieOptions(isProd));

    // return access token to frontend
    return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
  }

  // Forgot password
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60, limit: 2 }, medium: { ttl: 900, limit: 5 } })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  // Verify OTP
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60, limit: 5 }, medium: { ttl: 900, limit: 10 } })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto.email, verifyOtpDto.otp);
  }

  // Reset password
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto.resetToken, resetPasswordDto.newPassword);
  }

  // Logout
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() body: { refreshToken?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookiesUnknown: unknown = (req as unknown as { cookies?: unknown }).cookies;
    const cookies = typeof cookiesUnknown === 'object' && cookiesUnknown !== null
      ? (cookiesUnknown as { refreshToken?: unknown })
      : undefined;

    const refreshTokenRaw = body.refreshToken ?? cookies?.refreshToken;
    const refreshToken = typeof refreshTokenRaw === 'string' ? refreshTokenRaw : undefined;

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    const isProd = this.configService.get('NODE_ENV') === 'production';
    res.clearCookie('refreshToken', this.cookieOptions(isProd) as any);

    return { message: 'Logged out successfully' };
  }

  // Logout all devices
  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(@CurrentUser('id') userId: string, @Res({ passthrough: true }) res: Response) {
    await this.authService.logoutAll(userId);
    const isProd = this.configService.get('NODE_ENV') === 'production';
    res.clearCookie('refreshToken', this.cookieOptions(isProd) as any);
    return { message: 'Logged out from all devices successfully' };
  }
}
