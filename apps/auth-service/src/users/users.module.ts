import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { AuthAccount } from './entities/auth-account.entity';
import { AuthModule } from '../auth/auth.module';
import { UsersAdminController } from './users-admin.controller';
import { Course } from 'apps/course/src/courses/entities/course.entity';
import { UserXp } from 'apps/course/src/quizs/entities/user-xp.entity';
import { UserStreak } from 'apps/course/src/streaks/entities/user-streak.entity';
import { LessonProgress } from 'apps/course/src/progress/entities/progress.entity';
import { Lesson } from 'apps/course/src/lessons/entities/lesson.entity';
import { Chapter } from 'apps/course/src/chapters/entities/chapter.entity';
import { Level } from 'apps/course/src/levels/entities/level.entity';
import { Article } from 'apps/course/src/articles/entities/article.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AuthAccount], 'auth'),
    TypeOrmModule.forFeature([UserXp, UserStreak, LessonProgress, Lesson, Chapter, Level, Course, Article], 'course'),
    HttpModule,
    ConfigModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController, UsersAdminController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
