import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { LearningProgressService } from './learning-progress.service';
import { LearningDashboardService } from './learning-dashboard.service';
import { ChapterProgressService } from './chapter-progress.service';
import { LearningProgressController } from './learning-progress.controller';
import { LessonProgress } from './entities/lesson-progress.entity';
import { ChapterProgress } from './entities/chapter-progress.entity';
import { ItemProgress } from './entities/item-progress.entity';
import { CourseClientService } from './course-client.service';

@Module({
  imports: [
    // 🔹 DB: learning
    TypeOrmModule.forFeature([LessonProgress, ChapterProgress, ItemProgress], 'learning'),

    HttpModule,
  ],
  controllers: [LearningProgressController],
  providers: [LearningProgressService, LearningDashboardService, ChapterProgressService, CourseClientService],
  exports: [LearningProgressService, LearningDashboardService, ChapterProgressService, CourseClientService],
})
export class LearningProgressModule {}
