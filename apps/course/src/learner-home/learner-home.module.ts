import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { AuthLibModule } from '@auth';

import { LearnerHomeController } from './learner-home.controller';
import { LearnerHomeService } from './learner-home.service';
import { LessonProgress } from '../progress/entities/progress.entity';
import { UserXp } from '../quizs/entities/user-xp.entity';
import { Lesson } from '../lessons/entities/lesson.entity';
import { Chapter } from '../chapters/entities/chapter.entity';
import { Course } from '../courses/entities/course.entity';
import { Level } from '../levels/entities/level.entity';
import { StreakService } from '../streaks/streak.service';
import { UserStreak } from '../streaks/entities/user-streak.entity';
import { ProgressService } from '../progress/progress.service';
import { QuizService } from '../quizs/quiz.service';
import { Quizs } from '../quizs/entities/quizs.entity';
import { QuizsCheckpoint } from '../quizs/entities/checkpoint.entity';
import { QuizsResult } from '../quizs/entities/quizs-result.entity';
import { WishlistModule } from '../wishlist/wishlist.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LessonProgress,
      UserXp,
      Lesson,
      Chapter,
      Course,
      Level,
      UserStreak,
      Quizs,
      QuizsCheckpoint,
      QuizsResult,
    ]),
    HttpModule,
    AuthLibModule,
    WishlistModule,
    NotificationsModule,
  ],
  controllers: [LearnerHomeController],
  providers: [LearnerHomeService, StreakService, ProgressService, QuizService],
})
export class LearnerHomeModule {}
