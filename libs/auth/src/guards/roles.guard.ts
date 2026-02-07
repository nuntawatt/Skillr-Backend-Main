// import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';
// import { UserRole } from '@common/enums';
// import { ROLES_KEY } from '../decorators/roles.decorator';
// import type { AuthUser } from '../types/auth-user.type';

// @Injectable()
// export class RolesGuard implements CanActivate {
//   constructor(private readonly reflector: Reflector) {}

//   canActivate(context: ExecutionContext): boolean {
//     const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
//       ROLES_KEY,
//       [context.getHandler(), context.getClass()],
//     );

//     if (!requiredRoles || requiredRoles.length === 0) {
//       return true;
//     }

//     const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
//     const user = request.user;
//     return requiredRoles.some((role) => user?.role === role);
//   }
// }

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@common/enums';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthUser } from '../types/auth-user.type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: AuthUser;
      method?: string;
    }>();

    // อนุญาตคำขอ OPTIONS โดยไม่ต้องตรวจสอบสิทธิ์
    if (request.method === 'OPTIONS') {
      return true;
    }

    // 1. อ่าน role ที่ route / controller ต้องการ
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 2. ถ้า route ไม่ได้กำหนด role → ผ่านได้เลย
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 3. ดึง user จาก JwtAuthGuard
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Missing authentication');
    }

    // 4. เช็กว่า role ของ user ตรงกับที่ route ต้องการหรือไม่
    const hasPermission = requiredRoles.some(
      (role) => user.role === role,
    );

    if (!hasPermission) {
      throw new UnauthorizedException('Insufficient role');
    }

    return true;
  }
}
