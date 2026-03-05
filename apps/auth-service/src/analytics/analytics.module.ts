import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../users/entities/user.entity';
import { LessonProgress } from 'apps/course-service/src/progress/entities/progress.entity';
import { RewardRedemption } from 'apps/reward-service/src/reward/entities/reward-redemption';

import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User], 'auth'),
    TypeOrmModule.forFeature([LessonProgress], 'course'),
    TypeOrmModule.forFeature([RewardRedemption], 'reward'),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
