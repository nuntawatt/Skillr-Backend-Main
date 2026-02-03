import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { QuizController, QuizAdminController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { Quizs } from './entities/quizs.entity';
import { QuizsCheckpoint } from './entities/checkpoint.entity';
import { QuizsResult } from './entities/quizs-result.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quizs, QuizsCheckpoint, QuizsResult]),
    HttpModule,
  ],
  controllers: [QuizController, QuizAdminController],
  providers: [QuizService],
  exports: [QuizService],
})
export class QuizModule {}
