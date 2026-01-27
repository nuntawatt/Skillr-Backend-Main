import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { QuizController, QuestionController, InternalController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { Quiz } from './entities/quiz.entity';
import { Question } from './entities/question.entity';
import { QuizOption } from './entities/quiz-option.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quiz, Question, QuizOption, QuizAttempt]),
    HttpModule,
  ],
  controllers: [QuizController, QuestionController, InternalController],
  providers: [
    QuizService,
  ],
  exports: [QuizService],
})
export class QuizModule {}
