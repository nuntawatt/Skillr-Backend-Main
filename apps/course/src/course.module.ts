import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { getDatabaseConfig } from '@config/database.config';
import { AuthLibModule } from '@auth/auth-lib.module';

// controllers
import { CoursesController } from './courses/courses.controller';
import { LessonsController } from './lessons/lessons.controller';
import { ArticlesController } from './articles/articles.controller';

// services
import { CoursesService } from './courses/courses.service';
import { LessonsService } from './lessons/lessons.service';
import { ArticlesService } from './articles/articles.service';

// storage
import { StorageModule } from './storage/storage.module';

// entities
import { Course } from './courses/entities/course.entity';
import { Lesson } from './lessons/entities/lesson.entity';
import { LessonResource } from './lessons/entities/lesson-resource.entity';
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
            Lesson,
            LessonResource,
            Article,
          ]),

          AuthLibModule,
          StorageModule,
        ]),
  ],

  controllers: [
    CoursesController,
    LessonsController,
    ArticlesController,
  ],

  providers: [
    CoursesService,
    LessonsService,
    ArticlesService,
  ],
})
export class AppModule {}
