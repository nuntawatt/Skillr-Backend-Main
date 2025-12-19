import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearningController } from './learning.controller';
import { LearningService } from './learning.service';
import { Quiz } from './entities/quiz.entity';
import { Question } from './entities/question.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Quiz, Question, QuizAttempt])],
  controllers: [LearningController],
  providers: [LearningService],
  exports: [LearningService]
})
export class LearningModule {}
