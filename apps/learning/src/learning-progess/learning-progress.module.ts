import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { LearningProgressService } from './learning-progress.service';
import { LearningDashboardService } from './learning-dashboard.service';
import { RoadmapService } from '../roadmap/roadmap.service';
import { LearningProgressController } from './learning-progress.controller';
import { GamificationController } from './gamification.controller';
import { LessonProgress } from './entities/lesson-progress.entity';
import { ChapterProgress } from './entities/chapter-progress.entity';
import { ChapterProgressService } from './chapter-progress.service';
import { LessonProgressService } from './lesson-progress.service';
import { CheckpointService } from './checkpoint.service';
import { ProgressValidationService } from './progress-validation.service';
import { GamificationService } from './gamification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LessonProgress, ChapterProgress]),
    HttpModule,
  ],
  controllers: [LearningProgressController, GamificationController],
  providers: [
    LearningProgressService, 
    LearningDashboardService, 
    RoadmapService,
    ChapterProgressService,
    LessonProgressService,
    CheckpointService,
    ProgressValidationService,
    GamificationService
  ],
  exports: [
    LearningProgressService, 
    LearningDashboardService, 
    RoadmapService,
    ChapterProgressService,
    LessonProgressService,
    CheckpointService,
    ProgressValidationService,
    GamificationService
  ],
})
export class LearningProgressModule {}
