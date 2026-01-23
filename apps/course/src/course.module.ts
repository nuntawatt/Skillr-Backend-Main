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

// Services
import { CoursesService } from './courses/courses.service';
import { LevelsService } from './levels/levels.service';
import { ChaptersService } from './chapters/chapters.service';
import { LessonsService } from './lessons/lessons.service';
import { ArticlesService } from './articles/articles.service';
import { StorageService } from './storage/storage.service';

// Entities
import { Course } from './courses/entities/course.entity';
import { Level } from './levels/entities/level.entity';
import { Chapter } from './chapters/entities/chapter.entity';
import { Lesson } from './lessons/entities/lesson.entity';
import { Article } from './articles/entities/article.entity';

const isTest =
  process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

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
        ]),

        AuthLibModule,
      ]),
  ],

  controllers: [
    CoursesController,
    LevelsController,
    ChaptersController,
    LessonsController,
    ArticlesController,
  ],

  providers: [
    CoursesService,
    LevelsService,
    ChaptersService,
    LessonsService,
    ArticlesService,
    StorageService,
  ],
})
export class AppModule { }
