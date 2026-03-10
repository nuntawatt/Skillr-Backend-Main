import { Module } from '@nestjs/common';
import { RewardService } from './reward.service';
import { RewardController } from './reward.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reward } from './entities/rewards.entity';
import { RewardRedemption } from './entities/reward-redemption';
import { User } from 'apps/auth-service/src/users/entities';
import { UserXp } from 'apps/course-service/src/quizs/entities/user-xp.entity';
import { RewardStatusService } from './reward-status.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reward, RewardRedemption], 'reward'),
    TypeOrmModule.forFeature([User, UserXp], 'course'),
  ],
  controllers: [RewardController],
  providers: [RewardService, RewardStatusService],
  exports: [RewardStatusService],
})
export class RewardModule {}
