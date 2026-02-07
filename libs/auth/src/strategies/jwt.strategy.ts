import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthUser } from '../types/auth-user.type';

type JwtPayload = {
  sub?: number | string;
  id?: number | string;
  email?: string;
  role?: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
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
    const role = payload.role === 'ADMIN' || payload.role === 'STUDENT'
      ? payload.role
      : 'STUDENT';
      
    return {
      // id: payload.id,
      sub: payload.sub ?? payload.id,
      email: payload.email,
      role,
    };
  }
}
