import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthLibModule } from '@auth';

import { Lesson } from '../lessons/entities/lesson.entity';
import { AiQuizGeneration } from './entities/ai-analyzer-entity';
import { Quizs } from '../quizs/entities/quizs.entity';

import { AiQuizAdminController } from './ai-quiz-admin.controller';
import { AiQuizService } from './ai-quiz.service';

@Module({
  imports: [
    AuthLibModule,
    TypeOrmModule.forFeature([Lesson, Quizs, AiQuizGeneration]),
  ],
  controllers: [AiQuizAdminController],
  providers: [AiQuizService],
  exports: [AiQuizService],
})
export class AiQuizModule {}