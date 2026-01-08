import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { getDatabaseConfig } from '@config/database.config';
import { AuthLibModule } from '@auth/auth-lib.module';

// controllers
import { CoursesController } from './controllers/courses.controller';
import { LessonsController } from './controllers/lessons.controller';

// services
import { CoursesService } from './services/courses.service';
import { LessonsService } from './services/lessons.service';

// entities
import { Course } from './entities/course.entity';
import { Lesson } from './entities/lesson.entity';
import { LessonResource } from './entities/lesson-resource.entity';

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
