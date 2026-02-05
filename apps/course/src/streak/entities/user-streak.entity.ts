import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_streak')
@Index('idx_user_streak_user_id', ['userId'])
export class UserStreak {
  @PrimaryGeneratedColumn({ name: 'user_streak_id', type: 'int' })
  userStreakId: number;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'current_streak', type: 'int', default: 0 })
  currentStreak: number;

  @Column({ name: 'longest_streak', type: 'int', default: 0 })
  longestStreak: number;

  @Column({ name: 'last_activity_date', type: 'date', nullable: true })
  lastActivityDate?: Date | null;

  @Column({ name: 'streak_start_date', type: 'date', nullable: true })
  streakStartDate?: Date | null;

  @Column({ name: 'timezone_offset', type: 'int', default: 0 })
  timezoneOffset: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
