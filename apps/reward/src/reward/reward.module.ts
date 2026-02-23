import { Module } from '@nestjs/common';
import { RewardService } from './reward.service';
import { RewardController } from './reward.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reward } from './entities/rewards.entity';
import { RewardRedemption } from './entities/reward-redemption';

@Module({
  imports: [TypeOrmModule.forFeature([Reward, RewardRedemption])],
import { User } from 'apps/auth/src/users/entities';
import { UserXp } from 'apps/course/src/quizs/entities/user-xp.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reward,
      RewardRedemption,
    ] , 'reward'),
    TypeOrmModule.forFeature([
      UserXp,
    ] , 'course'),
  ],
  controllers: [RewardController],
  providers: [RewardService],
})
export class RewardModule {}
