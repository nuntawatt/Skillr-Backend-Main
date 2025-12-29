import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index, } from 'typeorm';
import { Exclude } from 'class-transformer';
import { AuthProvider, UserRole } from '@common/enums';
import { PasswordResetToken } from './password-reset-token.entity';
import { Session } from './session.entity';
import { EmailVerificationToken } from './email-verification-token.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column({ name: 'password_hash', nullable: true })
  passwordHash: string;

  @Exclude()
  @Column({ name: 'google_id', nullable: true, unique: true })
  googleId: string;

  @Index({ unique: true })
  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ name: 'first_name', nullable: true })
  firstName: string;

  @Column({ name: 'last_name', nullable: true })
  lastName: string;

  @Column({
    name: 'auth_provider',
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  provider: AuthProvider;

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
  @OneToMany(() => EmailVerificationToken, (token) => token.user)
  emailVerificationTokens: EmailVerificationToken[];

  @Exclude()
  @OneToMany(() => PasswordResetToken, (token) => token.user)
  passwordResetTokens: PasswordResetToken[];
}
