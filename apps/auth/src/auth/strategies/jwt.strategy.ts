import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull } from 'typeorm';
import { Session } from '../../users/entities/session.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {
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

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // If the token includes a session id (sid), ensure the session is active.
    if ((payload as any).sid) {
      const sid = (payload as any).sid as string;
      const session = await this.sessionRepository.findOne({
        where: { id: sid, revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      });
      if (!session) {
        throw new UnauthorizedException('Session is not active');
      }
    }

    const role = String(user.role);
    const normalizedRole = role === 'INSTRUCTOR' ? 'ADMIN' : role;
    return {
      id: user.id,
      email: user.email,
      role: normalizedRole,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}
