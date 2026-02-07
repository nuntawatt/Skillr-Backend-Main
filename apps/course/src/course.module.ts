import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from '@config/database.config';
import { AuthLibModule } from '@auth/auth-lib.module';

// Controllers
import { CoursesController } from './courses/courses.controller';
import { LevelsController } from './levels/levels.controller';
import { ChaptersController } from './chapters/chapters.controller';
import { LessonsController } from './lessons/lessons.controller';
import { ArticlesController } from './articles/articles.controller';
import { ProgressController } from './progress/progress.controller';
import { QuizAdminController, QuizController } from './quizs/quiz.controller';

// Services
import { CoursesService } from './courses/courses.service';
import { LevelsService } from './levels/levels.service';
import { ChaptersService } from './chapters/chapters.service';
import { LessonsService } from './lessons/lessons.service';
import { ArticlesService } from './articles/articles.service';
import { StorageService } from './storage/storage.service';
import { ProgressService } from './progress/progress.service';
import { QuizService } from "./quizs/quiz.service";

// Entities
import { Course } from './courses/entities/course.entity';
import { Level } from './levels/entities/level.entity';
import { Chapter } from './chapters/entities/chapter.entity';
import { Lesson } from './lessons/entities/lesson.entity';
import { Article } from './articles/entities/article.entity';
import { LessonProgress } from './progress/entities/progress.entity';
import { Quizs } from './quizs/entities/quizs.entity';
import { QuizsCheckpoint } from './quizs/entities/checkpoint.entity';
import { QuizsResult } from './quizs/entities/quizs-result.entity';
import { UserXp } from './quizs/entities/user-xp.entity';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/course/.env', '.env'],
    }),

    ...(isTest
      ? []
      : [
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: getDatabaseConfig,
          inject: [ConfigService],
        }),

        TypeOrmModule.forFeature([
          Course,
          Level,
          Chapter,
          Lesson,
          Article,
          LessonProgress,
          UserXp,
          Quizs,
          QuizsCheckpoint,
          QuizsResult,
        ]),

        AuthLibModule
      ]),
  ],

  controllers: [
    CoursesController,
    LevelsController,
    ChaptersController,
    LessonsController,
    ArticlesController,
    ProgressController,
    QuizController,
    QuizAdminController,
  ],

  providers: [
    CoursesService,
    LevelsService,
    ChaptersService,
    LessonsService,
    ArticlesService,
    StorageService,
    ProgressService,
    QuizService,
  ],
})
export class AppModule { }