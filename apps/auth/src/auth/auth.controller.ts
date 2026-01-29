import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Controller, Post, Get, Body, UseGuards, Req, Res, HttpCode, HttpStatus, BadRequestException, Logger, UnauthorizedException } from '@nestjs/common';
import { RegisterDto, LoginDto, RefreshTokenDto, ForgotPasswordDto, VerifyOtpDto, ResetPasswordDto } from './dto';
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

/**
- Cookie options central:
- DEV: no domain, secure=false, sameSite=lax
- PROD: domain from env, secure=true, sameSite=none (for cross-site cookies)
 */
const isProd = process.env.NODE_ENV === 'production';
const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  ...(isProd && { domain: process.env.COOKIE_DOMAIN }),
  path: '/',
};

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) { }

  // Register a new user
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // Login
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login & Admin login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'User logged in successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized. Invalid credentials.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    return this.authService.login(loginDto, userAgent, ipAddress);
  }

  // Google OAuth - Initiate
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth2 login' })
  @ApiResponse({ status: 200, description: 'User authenticated via Google OAuth2.' })
  @ApiResponse({ status: 400, description: 'Bad Request. Invalid Google OAuth2 request.' })
  @ApiResponse({ status: 302, description: 'Redirect to Google OAuth2 consent screen.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async googleAuth() {
    // Guard handles redirection to Google

  }

  // Google OAuth - Callback
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth2 callback' })
  @ApiResponse({ status: 302, description: 'Redirect to frontend after login' })
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as {
      googleId: string;
      email: string;
      firstName?: string;
      lastName?: string;
      avatar?: string;
    };

    const { tokens } = await this.authService.googleLogin(user);

    this.logger.debug(`Setting refresh cookie: httpOnly=true, secure=${cookieOptions.secure}, sameSite='${cookieOptions.sameSite}', path='/'`);

    // SET cookie (dev: no domain, prod: domain from env)
    // res.cookie('refreshToken', tokens.refreshToken, cookieOptions);

    const frontendUrl = isProd
      ? this.configService.get<string>('FRONTEND_URL')
      : 'http://localhost:3000';

    return res.redirect(`${frontendUrl}/instructor`);
  }

  // Google OAuth - Token Exchange
  @Post('google/token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Google OAuth2 token exchange' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { id_token: { type: 'string', example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...' } },
      required: ['id_token'],
    },
  })
  @ApiResponse({ status: 200, description: 'User authenticated via Google OAuth2 token exchange.' })
  @ApiResponse({ status: 302, description: 'Redirect after successful Google OAuth2 token exchange.' })
  @ApiResponse({ status: 400, description: 'Bad Request. Invalid Google OAuth2 token.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })

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

    // // For token-exchange flow we return tokens directly
    return this.authService.googleLogin(profile);
  }

  // Refresh token
  // @Post('refresh')
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Refresh access and refresh tokens' })
  // @ApiBody({ type: RefreshTokenDto })
  // @ApiResponse({ status: 200, description: 'Tokens refreshed successfully.' })
  // @ApiResponse({ status: 400, description: 'Bad Request. Refresh token is required.' })
  // @ApiResponse({ status: 401, description: 'Unauthorized. Invalid or expired refresh token.' })
  // @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  // async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto, @Req() req: Request) {

  //   return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  // }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(@Req() req: Request) {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    return this.authService.refreshTokens(refreshToken);
  }
  

  // Forgot password - send OTP
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate forgot password process by sending OTP' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: 'OTP sent successfully to the provided email.' })
  @ApiResponse({ status: 400, description: 'Bad Request. Invalid email address.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  @Throttle({ short: { ttl: 60, limit: 2 }, medium: { ttl: 900, limit: 5 } })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  // Verify OTP
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP sent to email' })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({ status: 200, description: 'OTP verified successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request. Invalid email or OTP.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  @Throttle({ short: { ttl: 60, limit: 5 }, medium: { ttl: 900, limit: 10 } })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto.email, verifyOtpDto.otp);
  }

  // Reset password (after OTP verification)
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using the reset token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request. Invalid reset token or password.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.resetToken,
      resetPasswordDto.newPassword,
    );
  }

  // Logout
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout from current session' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' } },
      required: [],
    },
  })
  @ApiResponse({ status: 200, description: 'Logged out successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request. Invalid refresh token.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async logout(@Body() body: { refreshToken?: string }, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookiesUnknown: unknown = (req as unknown as { cookies?: unknown }).cookies;
    const cookies = typeof cookiesUnknown === 'object' && cookiesUnknown !== null
      ? (cookiesUnknown as { refreshToken?: unknown })
      : undefined;

    const refreshTokenRaw = body.refreshToken ?? cookies?.refreshToken;
    const refreshToken =
      typeof refreshTokenRaw === 'string' ? refreshTokenRaw : undefined;

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    // res.clearCookie('refreshToken', cookieOptions);

    return { message: 'Logged out successfully', };
  }

  // Logout from all devices
  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({ status: 200, description: 'Logged out from all devices successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized. Invalid or expired token.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async logoutAll(@CurrentUser('id') userId: string, @Res({ passthrough: true }) res: Response) {
    await this.authService.logoutAll(userId);

    // res.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: 'none', path: '/' }); // อันนนี้มีปัญหา

    // Clear cookie by setting it to empty with past expiry
    res.cookie('refreshToken', cookieOptions);

    return { message: 'Logged out from all devices successfully' };
  }
}