import { Injectable, UnauthorizedException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull } from 'typeorm';

import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { Session } from '../users/entities/session.entity';
import { PasswordResetToken } from '../users/entities/password-reset-token.entity';
import { RegisterDto, LoginDto } from './dto';
import { LoginAttemptsService } from './login-attempts.service';
import { EmailService } from './email.service';
import { AuthProvider } from '@common/enums';

// Constants
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
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    private readonly loginAttemptsService: LoginAttemptsService,
    private readonly emailService: EmailService,
  ) {}

  // Register
  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const existingAccount = await this.usersService.findAuthAccountByProviderAndEmail(AuthProvider.LOCAL, registerDto.email);
    if (existingAccount) {
      throw new ConflictException('Email already exists');
    }

    let user = await this.usersService.findByEmail(registerDto.email);
    if (!user) {
      user = await this.usersService.create({
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        email: registerDto.email,
      });
    }

    await this.usersService.createEmailAuthAccount(user, registerDto.email, registerDto.password);
    const tokens = await this.generateTokens(user);
    return { user: this.sanitizeUser(user), tokens };
  }

  // Login (email)
  async login(loginDto: LoginDto, userAgent?: string, ipAddress?: string): Promise<AuthResponse> {
    const invalidMessage = 'Invalid email or password';

    const lockStatus = await this.loginAttemptsService.getLockStatus(loginDto.email);
    if (lockStatus.isLocked) {
      throw new UnauthorizedException(this.formatLockMessage(lockStatus.remainingMs));
    }

    const authAccount = await this.usersService.findAuthAccountByProviderAndEmail(AuthProvider.LOCAL, loginDto.email);
    if (!authAccount?.user) {
      const nextStatus = await this.loginAttemptsService.recordFailure(loginDto.email);
      throw new UnauthorizedException(nextStatus.isLocked ? this.formatLockMessage(nextStatus.remainingMs) : invalidMessage);
    }

    const isPasswordValid = await this.usersService.verifyPasswordHash(authAccount.passwordHash, loginDto.password);
    if (!isPasswordValid) {
      const nextStatus = await this.loginAttemptsService.recordFailure(loginDto.email);
      throw new UnauthorizedException(nextStatus.isLocked ? this.formatLockMessage(nextStatus.remainingMs) : invalidMessage);
    }

    if ((authAccount.user.status ?? '').toLowerCase() !== 'active') {
      throw new UnauthorizedException('Account is inactive or suspended');
    }

    const tokens = await this.generateTokens(authAccount.user, userAgent, ipAddress);
    await this.loginAttemptsService.resetAttempts(loginDto.email);

    return { user: this.sanitizeUser(authAccount.user), tokens };
  }

  // Google Login
  async googleLogin(profile: { googleId: string; email: string; firstName?: string; lastName?: string; avatar?: string; }): Promise<AuthResponse> {
    const user = await this.usersService.findOrCreateFromGoogle(profile);

    if ((user.status ?? '').toLowerCase() !== 'active') {
      throw new UnauthorizedException('Account is inactive or suspended');
    }

    const tokens = await this.generateTokens(user);
    return { user: this.sanitizeUser(user), tokens };
  }

  // Refresh tokens: validate session, revoke old, create new session
  async refreshTokens(refreshTokenValue: string): Promise<TokenResponse> {
    const refreshTokenHash = this.hashRefreshToken(refreshTokenValue);
    const session = await this.sessionRepository.findOne({
      where: {
        refreshTokenHash,
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user'],
    });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // revoke old session
    session.revokedAt = new Date();
    await this.sessionRepository.save(session);

    // generate new tokens for same user
    return this.generateTokens(session.user);
  }

  // Logout all
  async logoutAll(userId: string): Promise<void> {
    await this.sessionRepository.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  // Logout single
  async logout(refreshTokenValue: string): Promise<void> {
    const refreshTokenHash = this.hashRefreshToken(refreshTokenValue);
    await this.sessionRepository.update({ refreshTokenHash, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  // Forgot password (send OTP)
  async forgotPassword(email: string): Promise<{ message: string }> {
    const genericMessage = 'If the email exists, an OTP will be sent.';

    const authAccount = await this.usersService.findAuthAccountByProviderAndEmail(AuthProvider.LOCAL, email);
    if (!authAccount?.user) {
      return { message: genericMessage };
    }

    await this.passwordResetTokenRepository.update({ userId: authAccount.user.id, isUsed: false }, { isUsed: true });

    const otp = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, BCRYPT_SALT_ROUNDS);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    const resetToken = this.passwordResetTokenRepository.create({
      token: otpHash,
      userId: authAccount.user.id,
      expiresAt,
    });

    await this.passwordResetTokenRepository.save(resetToken);
    await this.emailService.sendOtpEmail(email, otp);

    return { message: genericMessage };
  }

  // Verify OTP
  async verifyOtp(email: string, otp: string): Promise<{ resetToken: string }> {
    const invalidMessage = 'Invalid or expired OTP';

    const authAccount = await this.usersService.findAuthAccountByProviderAndEmail(AuthProvider.LOCAL, email);
    if (!authAccount?.user) {
      throw new BadRequestException(invalidMessage);
    }

    const tokens = await this.passwordResetTokenRepository.find({
      where: { userId: authAccount.user.id, isUsed: false, expiresAt: MoreThan(new Date()) },
      order: { createdAt: 'DESC' },
    });

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

    const resetTokenPlain = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = await bcrypt.hash(resetTokenPlain, BCRYPT_SALT_ROUNDS);

    const resetTokenExpiresAt = new Date();
    resetTokenExpiresAt.setMinutes(resetTokenExpiresAt.getMinutes() + RESET_TOKEN_EXPIRY_MINUTES);

    matchedToken.token = resetTokenHash;
    matchedToken.expiresAt = resetTokenExpiresAt;
    await this.passwordResetTokenRepository.save(matchedToken);

    return { resetToken: resetTokenPlain };
  }

  // Reset password using verified token
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const invalidMessage = 'Invalid or expired reset token';

    const tokens = await this.passwordResetTokenRepository.find({
      where: { isUsed: false, expiresAt: MoreThan(new Date()) },
      relations: ['user'],
    });

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

    await this.usersService.updatePassword(matchedToken.userId, newPassword);

    matchedToken.isUsed = true;
    await this.passwordResetTokenRepository.save(matchedToken);

    await this.logoutAll(matchedToken.userId);
    await this.emailService.sendPasswordChangedEmail(matchedToken.user.email || '');
    this.logger.log(`Password reset for userId=${matchedToken.userId}`);

    return { message: 'Password has been reset successfully' };
  }

  // Generate OTP
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Generate tokens & persist refresh token hash as session
  private async generateTokens(user: User, userAgent?: string, ipAddress?: string): Promise<TokenResponse> {
    const role = String(user.role);
    const normalizedRole = role === 'INSTRUCTOR' ? 'ADMIN' : role;

    const payload = { sub: user.id, email: user.email, role: normalizedRole };
    const accessToken = this.jwtService.sign(payload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days refresh token expiry

    const refreshTokenValue = crypto.randomBytes(48).toString('hex');
    const refreshTokenHash = this.hashRefreshToken(refreshTokenValue);
    const session = this.sessionRepository.create({
      refreshTokenHash,
      userId: user.id,
      expiresAt,
      userAgent: userAgent ?? null,
      revokedAt: null,
    });

    await this.sessionRepository.save(session);
    return { accessToken, refreshToken: refreshTokenValue, expiresIn: 15 * 60 };
  }

  private sanitizeUser(user: User): Partial<User> {
    return { ...user };
  }

  private hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private formatLockMessage(remainingMs: number): string {
    const secondsRemaining = Math.max(1, Math.ceil(remainingMs / 1000));
    return `Account locked. Please try again in ${secondsRemaining} seconds`;
  }
}
