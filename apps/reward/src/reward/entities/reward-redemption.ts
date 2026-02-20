import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Reward } from './rewards.entity';

export enum RedemptionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SHIPPED = 'SHIPPED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

@Entity('reward_redemptions')
@Index('idx_redemption_user', ['userId'])
@Index('idx_redemption_reward', ['reward'])
@Index('idx_redemption_status', ['status'])
@Index('idx_redemption_user_reward', ['userId', 'reward'])
@Index('idx_redemption_user_status', ['userId', 'status'])
@Index('idx_redemption_redeemed_at', ['redeemedAt'])
export class RewardRedemption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false})
  userId: number;

  @ManyToOne(() => Reward, (reward) => reward.redemptions, {
    onDelete: 'CASCADE',
  })
  reward: Reward;

  @Column()
  usedPoints: number;

  @Column({
    type: 'enum',
    enum: RedemptionStatus,
    default: RedemptionStatus.PENDING,
  })
  status: RedemptionStatus;

  @Column({ type: 'timestamp', nullable: true })
  expireAt: Date;

  @CreateDateColumn()
  redeemedAt: Date;
}