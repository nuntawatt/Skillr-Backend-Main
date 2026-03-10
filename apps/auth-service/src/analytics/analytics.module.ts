import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../users/entities/user.entity';
import { LessonProgress } from 'apps/course-service/src/progress/entities/progress.entity';
import { Course } from 'apps/course-service/src/courses/entities/course.entity';
import { UserStreak } from 'apps/course-service/src/streaks/entities/user-streak.entity';
import { WebsocketModule } from '../gateway/websocket.module';

import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User], 'auth'),
    TypeOrmModule.forFeature([LessonProgress, Course, UserStreak], 'course'),
    WebsocketModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
