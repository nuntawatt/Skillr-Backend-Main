import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Admin Invitation Entity
 * 
 * เก็บข้อมูลการเชิญผู้ดูแลระบบ (Admin) โดยเจ้าของระบบ (OWNER)
 * 
 * คอลัมน์สำคัญ:
 * - tokenHash: token ที่ถูก hash สำหรับยืนยันตัวตน
 * - responsibility: ความรับผิดชอบของ admin (ถ้ามี)
 * - userId: ผูกกับ user ที่ถูกเชิญ
 * - invitedByUserId: ผูกกับ user ที่ทำการเชิญ (ต้องเป็น OWNER)
 * - expiresAt: วันหมดอายุของ token (3 วัน)
 * - isUsed: สถานะการใช้งาน token (ใช้ได้ครั้งเดียว)
 */
@Entity('admin_invitations')
@Index(['userId', 'isUsed'])
@Index(['expiresAt'])
export class AdminInvitation {
  @PrimaryGeneratedColumn()
  id: number;

  /** Token ที่ถูก hash สำหรับยืนยันตัวตน (unique) */
  @Column({ name: 'token_hash', unique: true })
  tokenHash: string;

  /** ความรับผิดชอบของ admin (ถ้ามี) */
  @Column({ name: 'responsibility', type: 'varchar', length: 100, nullable: true })
  responsibility?: string | null;

  /** ID ของ user ที่ถูกเชิญ */
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  /** ID ของ user ที่ทำการเชิญ (ต้องเป็น OWNER) */
  @Column({ name: 'invited_by_user_id', type: 'uuid' })
  invitedByUserId: string;

  /** วันหมดอายุของ token (3 วัน) */
  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  /** สถานะการใช้งาน token (ใช้ได้ครั้งเดียว) */
  @Column({ name: 'is_used', type: 'boolean', default: false })
  isUsed: boolean;

  /** วันที่สร้าง invitation */
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  /** ความสัมพันธ์กับ user ที่ถูกเชิญ */
  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
