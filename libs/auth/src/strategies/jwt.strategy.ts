import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '@common/enums';
import type { AuthUser } from '../types/auth-user.type';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  sid?: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    const secret = configService.get<string>('JWT_ACCESS_SECRET');
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload): AuthUser {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const role =
      payload.role === UserRole.ADMIN
        ? UserRole.ADMIN
        : payload.role === UserRole.STUDENT
          ? UserRole.STUDENT
          : UserRole.STUDENT;

    return {
      userId: String(payload.sub),
      email: payload.email,
      role,
    };
  }
}
