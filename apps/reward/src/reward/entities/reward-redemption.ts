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
@Index('idx_redemption_user', ['user_id'])
@Index('idx_redemption_reward', ['reward'])
@Index('idx_redemption_user_reward', ['user_id', 'reward'])
@Index('idx_redemption_redeemed_at', ['redeemed_at'])
export class RewardRedemption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false})
  user_id: number;

  @ManyToOne(() => Reward, (reward) => reward.redemptions, {
    onDelete: 'CASCADE',
  })
  reward: Reward;

  @Column()
  used_points: number;

  @Column({ type: 'timestamp', nullable: true })
  expire_at: Date;

  @CreateDateColumn()
  redeemed_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @CreateDateColumn()
  updated_at: Date;

  @CreateDateColumn()
  delete_at: Date;

}