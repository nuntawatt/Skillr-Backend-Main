import { Injectable, UnauthorizedException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';

import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { Session } from '../users/entities/session.entity';
import { PasswordResetToken } from '../users/entities/password-reset-token.entity';
import { RegisterDto, LoginDto } from './dto';
import { LoginAttemptsService } from './login-attempts.service';
import { EmailService } from './email.service';

// Constants for OTP/Token configuration
const OTP_EXPIRY_MINUTES = 10;
const RESET_TOKEN_EXPIRY_MINUTES = 15;
const BCRYPT_SALT_ROUNDS = 10;

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: Partial<User>;
  tokens: TokenResponse;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    private readonly loginAttemptsService: LoginAttemptsService,
    private readonly emailService: EmailService,
  ) { }

  // Register a new user
  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const user = await this.usersService.create({
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      email: registerDto.email,
      password: registerDto.password,
    });

    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  // Login with email and password
  async login(loginDto: LoginDto, userAgent?: string, ipAddress?: string): Promise<AuthResponse> {
    const invalidMessage = 'Invalid email or password';

    const lockStatus = await this.loginAttemptsService.getLockStatus(loginDto.email);
    if (lockStatus.isLocked) {
      throw new UnauthorizedException(
        this.formatLockMessage(lockStatus.remainingMs),
      );
    }

    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      const nextStatus = await this.loginAttemptsService.recordFailure(loginDto.email);
      throw new UnauthorizedException(nextStatus.isLocked
        ? this.formatLockMessage(nextStatus.remainingMs)
        : invalidMessage,
      );
    }

    const isPasswordValid = await this.usersService.verifyPassword(user, loginDto.password);
    if (!isPasswordValid) {
      const nextStatus = await this.loginAttemptsService.recordFailure(loginDto.email);
      throw new UnauthorizedException(nextStatus.isLocked
        ? this.formatLockMessage(nextStatus.remainingMs)
        : invalidMessage,
      );
    }

    if ((user.status ?? '').toLowerCase() !== 'active') {
      throw new UnauthorizedException('Account is inactive or suspended');
    }

    const tokens = await this.generateTokens(user, userAgent, ipAddress);
    await this.loginAttemptsService.resetAttempts(loginDto.email);

    return { user: this.sanitizeUser(user), tokens };
  }

  // Login - Register with Google OAuth
  async googleLogin(profile: { googleId: string; email: string; firstName?: string; lastName?: string; avatar?: string; }): Promise<AuthResponse> {
    const user = await this.usersService.findOrCreateFromGoogle(profile);

    if ((user.status ?? '').toLowerCase() !== 'active') {
      throw new UnauthorizedException('Account is inactive or suspended');
    }

    const tokens = await this.generateTokens(user);

    return { user: this.sanitizeUser(user), tokens };
  }

  // Refresh access token using refresh token
  async refreshTokens(refreshTokenValue: string): Promise<TokenResponse> {
    const session = await this.sessionRepository.findOne({
      where: {
        refreshToken: refreshTokenValue,
        expiresAt: MoreThan(new Date())
      },
      relations: ['user']
    });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.sessionRepository.delete(session.id);
    return this.generateTokens(session.user);
  }

  // Logout from all devices
  async logoutAll(userId: number): Promise<void> {
    await this.sessionRepository.delete({ userId });
  }

  // Logout
  async logout(refreshTokenValue: string): Promise<void> {
    await this.sessionRepository.delete({ refreshToken: refreshTokenValue });
  }


  // Forgot password - send OTP (hashed before storage)
  async forgotPassword(email: string): Promise<{ message: string }> {
    const genericMessage = 'If the email exists, an OTP will be sent.';

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { message: genericMessage };
    }

    // Invalidate any existing OTPs for this user
    await this.passwordResetTokenRepository.update(
      { userId: user.id, isUsed: false },
      { isUsed: true },
    );

    // Generate 6-digit OTP and hash it before storage
    const otp = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, BCRYPT_SALT_ROUNDS);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    const resetToken = this.passwordResetTokenRepository.create({
      token: otpHash, // Store hashed OTP, never plain text
      userId: user.id,
      expiresAt,
    });

    await this.passwordResetTokenRepository.save(resetToken);

    // Send plain OTP to user via email
    await this.emailService.sendOtpEmail(user.email, otp);

    return { message: genericMessage };
  }

  // Verify OTP using bcrypt comparison
  async verifyOtp(email: string, otp: string): Promise<{ resetToken: string }> {
    const invalidMessage = 'Invalid or expired OTP';

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException(invalidMessage);
    }

    // Find non-expired, unused tokens for this user
    const tokens = await this.passwordResetTokenRepository.find({
      where: {
        userId: user.id,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    // Compare OTP with stored hashes using bcrypt
    let matchedToken: PasswordResetToken | null = null;
    for (const token of tokens) {
      const isMatch = await bcrypt.compare(otp, token.token);
      if (isMatch) {
        matchedToken = token;
        break;
      }
    }

    if (!matchedToken) {
      throw new BadRequestException(invalidMessage);
    }

    // Generate reset token and hash before storage
    const resetTokenPlain = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = await bcrypt.hash(resetTokenPlain, BCRYPT_SALT_ROUNDS);

    // Update expiry for reset token phase
    const resetTokenExpiresAt = new Date();
    resetTokenExpiresAt.setMinutes(resetTokenExpiresAt.getMinutes() + RESET_TOKEN_EXPIRY_MINUTES);

    // Replace OTP hash with reset token hash
    matchedToken.token = resetTokenHash;
    matchedToken.expiresAt = resetTokenExpiresAt;
    await this.passwordResetTokenRepository.save(matchedToken);

    // Return plain reset token to client
    return { resetToken: resetTokenPlain };
  }

  // Reset password with verified token
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const invalidMessage = 'Invalid or expired reset token';

    // Find all non-expired, unused tokens
    const tokens = await this.passwordResetTokenRepository.find({
      where: {
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user']
    });

    // Compare reset token with stored hashes using bcrypt
    let matchedToken: PasswordResetToken | null = null;
    for (const t of tokens) {
      const isMatch = await bcrypt.compare(token, t.token);
      if (isMatch) {
        matchedToken = t;
        break;
      }
    }

    if (!matchedToken) {
      throw new BadRequestException(invalidMessage);
    }

    // Update user password
    await this.usersService.updatePassword(matchedToken.userId, newPassword);

    // Mark token as used (clear sensitive fields)
    matchedToken.isUsed = true;
    await this.passwordResetTokenRepository.save(matchedToken);

    // Logout from all sessions for security
    await this.logoutAll(matchedToken.userId);

    await this.emailService.sendPasswordChangedEmail(matchedToken.user.email);
    this.logger.log(`Password reset for userId=${matchedToken.userId}`);

    return { message: 'Password has been reset successfully' };
  }

  // Generate 6-digit OTP
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Generate access and refresh tokens
  private async generateTokens(user: User, userAgent?: string, ipAddress?: string): Promise<TokenResponse> {
    const role = String(user.role);
    const normalizedRole = role === 'INSTRUCTOR' ? 'ADMIN' : role;

    const payload = { sub: user.id, email: user.email, role: normalizedRole };

    const accessToken = this.jwtService.sign(payload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days refresh token expiry

    const refreshTokenValue = crypto.randomBytes(48).toString('hex');
    const session = this.sessionRepository.create({
      refreshToken: refreshTokenValue,
      userId: user.id,
      expiresAt,
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
    });

    await this.sessionRepository.save(session);
    return { accessToken, refreshToken: refreshTokenValue, expiresIn: 15 * 60 };
  }

  // Remove sensitive fields user object
  private sanitizeUser(user: User): Partial<User> {
    const { passwordHash: passwordHashRemoved, ...sanitizedUser } = user;
    void passwordHashRemoved;
    return sanitizedUser;
  }

  private formatLockMessage(remainingMs: number): string {
    const secondsRemaining = Math.max(1, Math.ceil(remainingMs / 1000));
    return `Account locked. Please try again in ${secondsRemaining} seconds`;
  }
}