import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { LearningProgressService } from './learning-progress.service';
import { LearningDashboardService } from './learning-dashboard.service';
import { LearningProgressController } from './learning-progress.controller';
import { LessonProgress } from './entities/lesson-progress.entity';
import { CourseClientService } from './course-client.service';

@Module({
  imports: [
    // 🔹 DB: learning
    TypeOrmModule.forFeature([LessonProgress], 'learning'),

    HttpModule,
  ],
  controllers: [LearningProgressController],
  providers: [LearningProgressService, LearningDashboardService, CourseClientService],
  exports: [LearningProgressService, LearningDashboardService, CourseClientService],
})
export class LearningProgressModule {}
