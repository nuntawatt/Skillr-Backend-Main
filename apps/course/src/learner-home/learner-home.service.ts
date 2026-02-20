import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { StreakService } from '../streaks/streak.service';
import { NotificationsService } from '../notifications/notifications.service';

import { LessonProgress } from '../progress/entities/progress.entity';
import { UserXp } from '../quizs/entities/user-xp.entity';
import { Lesson } from '../lessons/entities/lesson.entity';
import { Chapter } from '../chapters/entities/chapter.entity';
import { Course } from '../courses/entities/course.entity';
import { Level } from '../levels/entities/level.entity';

import { LearnerHomeResponseDto } from './dto/learner-home-response.dto';

/* ======================================================
   🔹 Interfaces
====================================================== */

interface UserProfile {
  displayName: string | null;
  avatarUrl: string | null;
}

interface UserResponse {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  avatar?: string | null;
}

/* ======================================================
   🔹 Service
====================================================== */

@Injectable()
export class LearnerHomeService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly streakService: StreakService,
    private readonly notificationsService: NotificationsService,

    @InjectRepository(LessonProgress)
    private readonly lessonProgressRepository: Repository<LessonProgress>,

    @InjectRepository(UserXp)
    private readonly userXpRepository: Repository<UserXp>,

    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,

    @InjectRepository(Chapter)
    private readonly chapterRepository: Repository<Chapter>,

    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,

    @InjectRepository(Level)
    private readonly levelRepository: Repository<Level>,
  ) {}

  /* ======================================================
     🔹 Main Entry
  ====================================================== */

  async getHome(userId: string): Promise<LearnerHomeResponseDto> {
    const [
      profile,
      streak,
      totalXp,
      continueLearning,
      myCourses,
      notifications,
      recommendations,
    ] = await Promise.all([
      this.getUserProfile(userId).catch(() => null),
      this.getStreak(userId).catch(() => ({ currentStreak: 0 })),
      this.getTotalXp(userId).catch(() => 0),
      this.getContinueLearning(userId).catch(() => null),
      this.getMyCourses(userId).catch(() => []),
      this.getNotifications(userId).catch(() => ({ unreadCount: 0 })),
      this.getRecommendations(userId).catch(() => ({ courses: [] })),
    ]);

    return {
      header: {
        userId,
        displayName: profile?.displayName ?? null,
        avatarUrl: profile?.avatarUrl ?? null,
        xp: totalXp,
        streakDays: streak.currentStreak,
      },
      continueLearning,
      myCourses,
      notifications,
      recommendations,
    };
  }

  /* ======================================================
     🔹 Profile
  ====================================================== */

  private async getUserProfile(
    userId: string,
  ): Promise<UserProfile | null> {
    try {
      const authBaseUrl = this.configService.get<string>(
        'AUTH_BASE_URL',
        'http://localhost:3001',
      );

      const response = await this.httpService.axiosRef.get(
        `${authBaseUrl}/users/profile`,
        {
          headers: {
            Authorization: `Bearer ${this.configService.get(
              'JWT_SECRET',
              'demo-token',
            )}`,
          },
        },
      );

      const user: UserResponse = response.data;

      return {
        displayName:
          user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.username ?? null,
        avatarUrl: user.avatar ?? null,
      };
    } catch {
      return null;
    }
  }

  /* ======================================================
     🔹 Streak & XP
  ====================================================== */

  private async getStreak(userId: string) {
    const { streak } = await this.streakService.getStreak(userId);
    return streak;
  }

  private async getTotalXp(userId: string) {
    const result = await this.userXpRepository
      .createQueryBuilder('ux')
      .select('COALESCE(SUM(ux.xpEarned), 0)', 'total')
      .where('ux.userId = :userId', { userId })
      .getRawOne<{ total: string }>();

    return Number(result?.total ?? 0);
  }

  /* ======================================================
     🔹 Continue Learning
  ====================================================== */

  private async getContinueLearning(userId: string) {
    const latestProgress =
      await this.lessonProgressRepository.findOne({
        where: { userId },
        order: { lastViewedAt: 'DESC' },
        relations: ['lesson'],
      });

    if (!latestProgress?.lesson) return null;

    if (
      latestProgress.status === 'LOCKED' ||
      latestProgress.status === 'COMPLETED'
    ) {
      const nextLesson = await this.findNextAvailableLesson(
        userId,
        latestProgress.lessonId,
      );
      if (!nextLesson) return null;
      return this.buildContinueLearningDto(nextLesson);
    }

    return this.buildContinueLearningDto({
      lesson: latestProgress.lesson,
      progress: latestProgress,
    });
  }

  private async findNextAvailableLesson(
    userId: string,
    currentLessonId: number,
  ) {
    const current = await this.lessonRepository.findOne({
      where: { lesson_id: currentLessonId },
    });
    if (!current) return null;

    const nextLesson = await this.lessonRepository.findOne({
      where: {
        chapter_id: current.chapter_id,
        orderIndex: current.orderIndex + 1,
      },
    });

    if (!nextLesson) return null;

    const nextProgress =
      await this.lessonProgressRepository.findOne({
        where: { userId, lessonId: nextLesson.lesson_id },
      });

    if (!nextProgress || nextProgress.status === 'LOCKED')
      return null;

    return { lesson: nextLesson, progress: nextProgress };
  }

  private async buildContinueLearningDto(
    input:
      | Lesson
      | { lesson: Lesson; progress: LessonProgress | null },
  ) {
    const lesson =
      'lesson' in input ? input.lesson : input;
    const progress =
      'lesson' in input ? input.progress : null;

    const chapter = await this.chapterRepository.findOne({
      where: { chapter_id: lesson.chapter_id },
    });
    if (!chapter) return null;

    const level = await this.levelRepository.findOne({
      where: { level_id: chapter.levelId },
    });

    const course = level
      ? await this.courseRepository.findOne({
          where: { course_id: level.course_id },
        })
      : null;

    if (!course) return null;

    return {
      course_id: course.course_id,
      course_title: course.course_title,
      chapter_title: chapter.chapter_title,
      level_name: level?.level_title ?? 'ระดับพื้นฐาน',
      progressPercent: progress?.progressPercent ?? 0,
    };
  }

  /* ======================================================
     🔹 My Courses
  ====================================================== */

  private async getMyCourses(userId: string) {
    const allProgress =
      await this.lessonProgressRepository.find({
        where: { userId },
        relations: ['lesson'],
      });

    if (!allProgress.length) return [];

    const courseMap = new Map<
      number,
      { total: number; completed: number; title: string }
    >();

    for (const progress of allProgress) {
      if (!progress.lesson) continue;

      const lesson = progress.lesson;
      const chapter = await this.chapterRepository.findOne({
        where: { chapter_id: lesson.chapter_id },
      });
      if (!chapter) continue;

      const level = await this.levelRepository.findOne({
        where: { level_id: chapter.levelId },
      });
      if (!level) continue;

      const course = await this.courseRepository.findOne({
        where: { course_id: level.course_id },
      });
      if (!course) continue;

      if (!courseMap.has(course.course_id)) {
        courseMap.set(course.course_id, {
          total: 0,
          completed: 0,
          title: course.course_title,
        });
      }

      const entry = courseMap.get(course.course_id)!;
      entry.total += 1;

      if (
        progress.status === 'COMPLETED' ||
        progress.status === 'SKIPPED'
      ) {
        entry.completed += 1;
      }
    }

    return Array.from(courseMap.entries()).map(
      ([courseId, data]) => ({
        course_id: courseId,
        title: data.title,
        progressPercent:
          data.total > 0
            ? Math.round((data.completed / data.total) * 100)
            : 0,
      }),
    );
  }

  /* ======================================================
     🔹 Notifications
  ====================================================== */

  private async getNotifications(userId: string) {
    const unreadCount =
      await this.notificationsService.getUnreadCount(userId);
    return { unreadCount };
  }

  /* ======================================================
     🔹 Recommendations
  ====================================================== */

  private async getRecommendations(userId: string) {
    const myCourses = await this.getMyCourses(userId);
    // console.log('My Courses:', myCourses);

    const recommendedCourses =
      await this.courseRepository.find({
        where: { isPublished: true },
        take: 3,
      });

    return {
      courses: recommendedCourses.map((course) => ({
        course_id: course.course_id,
        course_title: course.course_title,
        reason: 'คอร์สยอดนิยม',
        course_imageUrl:
          course.course_imageUrl ??
          `https://cdn.example.com/courses/course-${course.course_id}.jpg`,
        level_name: 'ระดับพื้นฐาน',
        courseTotalChapter: 6,
      })),
    };
  }
}