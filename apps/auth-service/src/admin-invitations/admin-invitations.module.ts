import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminInvitationsService } from './admin-invitations.service';
import { AdminInvitationsController } from './admin-invitations.controller';
import { AdminInvitation } from './entities/admin-invitation.entity';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

/**
 * Admin Invitations Module
 * 
 * จัดการการเชิญผู้ดูแลระบบ (Admin) โดยเจ้าของระบบ (OWNER)
 * 
 * ฟีเจอร์:
 * - เชิญ admin พร้อมส่งอีเมลและ temporary password
 * - ยอมรับการเชิญและตั้งรหัสผ่านใหม่
 * - ส่งอีเมลเชิญซ้ำ
 * - ดูรายการ admin ทั้งหมดพร้อมสถานะ
 * 
 * Dependencies:
 * - UsersModule: สำหรับจัดการข้อมูลผู้ใช้
 * - AuthModule: สำหรับส่งอีเมลและจัดการ authentication
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([AdminInvitation], 'auth'),
    UsersModule,
    AuthModule,
  ],
  controllers: [AdminInvitationsController],
  providers: [AdminInvitationsService],
  exports: [AdminInvitationsService],
})
export class AdminInvitationsModule {}
