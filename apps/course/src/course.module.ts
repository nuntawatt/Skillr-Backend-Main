import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { getDatabaseConfig } from '@config/database.config';
import { AuthLibModule } from '@auth/auth-lib.module';

// controllers
import { CoursesController } from './courses/courses.controller';
import { LessonsController } from './lessons/lessons.controller';

// services
import { CoursesService } from './courses/courses.service';
import { LessonsService } from './lessons/lessons.service';

// entities
import { Course } from './courses/entities/course.entity';
import { Lesson } from './lessons/entities/lesson.entity';
import { LessonResource } from './lessons/entities/lesson-resource.entity';

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
          ]),

          AuthLibModule,
        ]),
  ],

  controllers: [
    CoursesController,
    LessonsController,
  ],

  providers: [
    CoursesService,
    LessonsService,
  ],
})
export class AppModule {}
