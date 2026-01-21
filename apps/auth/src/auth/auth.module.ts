import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { UsersModule } from '../users/users.module';
import { Session } from '../users/entities/session.entity';
import { PasswordResetToken } from '../users/entities/password-reset-token.entity';
import { AuthAccount } from '../users/entities/auth-account.entity';
import { LoginAttempt } from './entities/login-attempt.entity';
import { LoginAttemptsService } from './login-attempts.service';
import { EmailService } from './email.service';
import { getJwtConfig } from '@config/jwt.config';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: getJwtConfig,
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Session, PasswordResetToken, LoginAttempt, AuthAccount]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy, LoginAttemptsService, EmailService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
