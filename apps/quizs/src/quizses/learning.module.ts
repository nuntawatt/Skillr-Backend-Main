import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearningController } from './learning.controller';
import { LearningService } from './learning.service';
import { LearningDashboardService } from './learning-dashboard.service';
import { LearningProgressService } from './learning-progress.service';
import { Quiz } from './entities/quiz.entity';
import { Question } from './entities/question.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { LessonProgress } from './entities/lesson-progress.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quiz, Question, QuizAttempt, LessonProgress]),
  ],
  controllers: [LearningController],
  providers: [
    LearningService,
    LearningProgressService,
    LearningDashboardService,
  ],
  exports: [LearningService, LearningProgressService, LearningDashboardService],
})
export class LearningModule {}
