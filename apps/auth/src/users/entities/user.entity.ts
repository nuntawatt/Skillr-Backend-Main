import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRole } from '@common/enums';
import { PasswordResetToken } from './password-reset-token.entity';
import { Session } from './session.entity';
import { AuthAccount } from './auth-account.entity';

// User Entity
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Index({ unique: true })
  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({
    name: 'avatar_media_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  avatar_media_id?: string | null;

  @Column({ name: 'first_name', nullable: true })
  firstName: string;

  @Column({ name: 'last_name', nullable: true })
  lastName: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Exclude()
  @OneToMany(() => Session, (session) => session.user)
  sessions: Session[];

  @Exclude()
  @OneToMany(() => AuthAccount, (account) => account.user)
  authAccounts: AuthAccount[];

  @Exclude()
  @OneToMany(() => PasswordResetToken, (token) => token.user)
  passwordResetTokens: PasswordResetToken[];
}
