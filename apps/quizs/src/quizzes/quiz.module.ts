import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { QuizController, QuizAdminController, QuestionAdminController, InternalController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { Quiz } from './entities/quiz.entity';
import { Question } from './entities/question.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quiz, Question, QuizAttempt]),
    HttpModule,
  ],
  controllers: [QuizController, QuizAdminController, QuestionAdminController, InternalController],
  providers: [
    QuizService,
  ],
  exports: [QuizService],
})
export class QuizModule {}
