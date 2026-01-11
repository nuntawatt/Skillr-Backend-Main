import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { MailerService } from '@nestjs-modules/mailer';

import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { Session } from '../users/entities/session.entity';
import { PasswordResetToken } from '../users/entities/password-reset-token.entity';
import { RegisterDto, LoginDto } from './dto';
import { LoginAttemptsService } from './login-attempts.service';

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
    private readonly mailerService: MailerService,
  ) {}

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
  async login(
    loginDto: LoginDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResponse> {
    const invalidMessage = 'Invalid email or password';

    const lockStatus = await this.loginAttemptsService.getLockStatus(
      loginDto.email,
    );
    if (lockStatus.isLocked) {
      throw new UnauthorizedException(
        this.formatLockMessage(lockStatus.remainingMs),
      );
    }

    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      const nextStatus = await this.loginAttemptsService.recordFailure(
        loginDto.email,
      );
      throw new UnauthorizedException(
        nextStatus.isLocked
          ? this.formatLockMessage(nextStatus.remainingMs)
          : invalidMessage,
      );
    }

    const isPasswordValid = await this.usersService.verifyPassword(
      user,
      loginDto.password,
    );
    if (!isPasswordValid) {
      const nextStatus = await this.loginAttemptsService.recordFailure(
        loginDto.email,
      );
      throw new UnauthorizedException(
        nextStatus.isLocked
          ? this.formatLockMessage(nextStatus.remainingMs)
          : invalidMessage,
      );
    }

    if ((user.status ?? '').toLowerCase() !== 'active') {
      throw new UnauthorizedException('Account is inactive or suspended');
    }

    const tokens = await this.generateTokens(
      user,
      userAgent,
      ipAddress,
      loginDto.rememberMe,
    );

    await this.loginAttemptsService.resetAttempts(loginDto.email);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  // Login - Register with Google OAuth
  async googleLogin(profile: {
    googleId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  }): Promise<AuthResponse> {
    const user = await this.usersService.findOrCreateFromGoogle(profile);

    if ((user.status ?? '').toLowerCase() !== 'active') {
      throw new UnauthorizedException('Account is inactive or suspended');
    }

    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  // Refresh access token using refresh token
  async refreshTokens(refreshTokenValue: string): Promise<TokenResponse> {
    const session = await this.sessionRepository.findOne({
      where: {
        refreshToken: refreshTokenValue,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user'],
    });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.sessionRepository.delete(session.id);
    return this.generateTokens(session.user);
  }

  // Logout
  async logout(refreshTokenValue: string): Promise<void> {
    await this.sessionRepository.delete({ refreshToken: refreshTokenValue });
  }

  // Logout from all devices
  async logoutAll(userId: number): Promise<void> {
    await this.sessionRepository.delete({ userId });
  }

  // Forgot password
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return {
        message: 'If the email exists, a password reset link will be sent.',
      };
    }

    await this.passwordResetTokenRepository.update(
      { userId: user.id, isUsed: false },
      { isUsed: true },
    );

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const resetToken = this.passwordResetTokenRepository.create({
      token,
      userId: user.id,
      expiresAt,
    });

    await this.passwordResetTokenRepository.save(resetToken);

    await this.safeSendResetEmail(user.email, token);

    return {
      message: 'If the email exists, a password reset link will be sent.',
    };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: {
        token,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user'],
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    await this.usersService.updatePassword(resetToken.userId, newPassword);

    resetToken.isUsed = true;
    await this.passwordResetTokenRepository.save(resetToken);
    await this.logoutAll(resetToken.userId);

    await this.safeSendPasswordChangedEmail(resetToken.user.email);
    this.logger.log(`Password reset for userId=${resetToken.userId}`);

    return { message: 'Password has been reset successfully' };
  }

  // Generate access and refresh tokens
  private async generateTokens(
    user: User,
    userAgent?: string,
    ipAddress?: string,
    rememberMe?: boolean,
  ): Promise<TokenResponse> {
    const role = String(user.role);
    const normalizedRole = role === 'INSTRUCTOR' ? 'ADMIN' : role;
    const payload = {
      sub: user.id,
      email: user.email,
      role: normalizedRole,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshExpiresIn = rememberMe ? 30 : 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshExpiresIn);

    const refreshTokenValue = crypto.randomBytes(48).toString('hex');
    const session = this.sessionRepository.create({
      refreshToken: refreshTokenValue,
      userId: user.id,
      expiresAt,
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
    });

    await this.sessionRepository.save(session);

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: 15 * 60,
    };
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

  private buildResetLink(token: string): string {
    const base =
      this.configService.get<string>('RESET_PASSWORD_URL') ??
      'http://localhost:3000/reset-password';
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}token=${encodeURIComponent(token)}`;
  }

  private async safeSendResetEmail(email: string, token: string): Promise<void> {
    const resetLink = this.buildResetLink(token);
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Reset your password',
        html: `
          <p>We received a request to reset your password.</p>
          <p><a href="${resetLink}">Click here to reset your password</a></p>
          <p>If you did not request this, you can safely ignore this email.</p>
        `,
        text: `Reset your password: ${resetLink}`,
      });
      this.logger.log(`Sent reset email to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send reset email to ${email}`, error as Error);
    }
  }

  private async safeSendPasswordChangedEmail(email: string): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Your password was changed',
        html: `
          <p>Your password was changed successfully.</p>
          <p>If this wasn't you, please reset your password immediately.</p>
        `,
        text: 'Your password was changed successfully. If this was not you, please reset it immediately.',
      });
      this.logger.log(`Sent password-changed email to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password-changed email to ${email}`,
        error as Error,
      );
    }
  }
}
