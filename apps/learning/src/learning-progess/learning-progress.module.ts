import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { LearningProgressService } from './learning-progress.service';
import { LearningDashboardService } from './learning-dashboard.service';
import { LearningProgressController } from './learning-progress.controller';
import { LessonProgress } from './entities/lesson-progress.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([LessonProgress]),
    HttpModule,
  ],
  controllers: [LearningProgressController],
  providers: [LearningProgressService, LearningDashboardService],
  exports: [LearningProgressService, LearningDashboardService],
})
export class LearningProgressModule {}
