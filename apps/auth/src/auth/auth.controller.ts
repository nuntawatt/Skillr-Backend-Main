import { Controller, Post, Get, Body, UseGuards, Req, Res, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto, } from './dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';

type GoogleTokenInfo = {
  aud?: string;
  audience?: string;
  sub?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) { }

  // Register a new user
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // Login
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    const result = await this.authService.login(loginDto, userAgent, ipAddress);
    if (loginDto.rememberMe) {
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: this.configService.get('NODE_ENV') === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }

    return result;
  }

  // Google OAuth - Initiate
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() { }

  // Google OAuth - Callback
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

    const result = await this.authService.googleLogin(user);
    return res.json(result);
  }

  // Google OAuth - Token Exchange
  @Post('google/token')
  @HttpCode(HttpStatus.OK)
  async googleToken(@Body() body: { idToken?: string; id_token?: string }) {
    const idToken = body.idToken || body.id_token;
    if (!idToken) {
      throw new BadRequestException('id_token is required');
    }

    const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;

    const resp = await fetch(tokenInfoUrl);
    if (!resp.ok) {
      throw new BadRequestException('Invalid id_token');
    }

    const info = (await resp.json()) as GoogleTokenInfo;

    // Verify audience (client id)
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

    return this.authService.googleLogin(profile);
  }

  // Refresh token
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
  ) {
    const cookiesUnknown: unknown = (req as unknown as { cookies?: unknown })
      .cookies;
    const cookies =
      typeof cookiesUnknown === 'object' && cookiesUnknown !== null
        ? (cookiesUnknown as { refreshToken?: unknown })
        : undefined;

    const refreshTokenRaw =
      refreshTokenDto.refreshToken ?? cookies?.refreshToken;
    const refreshToken =
      typeof refreshTokenRaw === 'string' ? refreshTokenRaw : undefined;

    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    return this.authService.refreshTokens(refreshToken);
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
    const cookiesUnknown: unknown = (req as unknown as { cookies?: unknown })
      .cookies;
    const cookies =
      typeof cookiesUnknown === 'object' && cookiesUnknown !== null
        ? (cookiesUnknown as { refreshToken?: unknown })
        : undefined;
    const refreshTokenRaw = body.refreshToken ?? cookies?.refreshToken;
    const refreshToken =
      typeof refreshTokenRaw === 'string' ? refreshTokenRaw : undefined;

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    res.clearCookie('refreshToken');

    return { message: 'Logged out successfully' };
  }

  // Logout from all devices
  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser('id') userId: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logoutAll(userId);
    res.clearCookie('refreshToken');
    return { message: 'Logged out from all devices successfully' };
  }

  // Forgot password - send reset email
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60, limit: 2 }, medium: { ttl: 900, limit: 5 } })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  // Reset password
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }

  // Get current authenticated user
  @Get('myself')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: unknown) {
    return user;
  }
}
