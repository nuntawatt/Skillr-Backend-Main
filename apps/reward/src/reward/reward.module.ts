import { Module } from '@nestjs/common';
import { RewardService } from './reward.service';
import { RewardController } from './reward.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reward } from './entities/rewards.entity';
import { RewardRedemption } from './entities/reward-redemption';

@Module({
  imports: [TypeOrmModule.forFeature([Reward, RewardRedemption])],
  controllers: [RewardController],
  providers: [RewardService],
})
export class RewardModule {}
