import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';

import { StreakService } from '../streaks/streak.service';
import { NotificationsService } from '../notifications/notifications.service';

import { LessonProgress } from '../progress/entities/progress.entity';
import { UserXp } from '../quizs/entities/user-xp.entity';
import { Course } from '../courses/entities/course.entity';

import { LearnerHomeResponseDto } from './dto/learner-home-response.dto';

interface UserProfile {
  displayName: string | null;
  avatarUrl: string | null;
}

@Injectable()
export class LearnerHomeService {
  constructor(
    private readonly httpService: HttpService,
    private readonly streakService: StreakService,
    private readonly notificationsService: NotificationsService,

    @InjectRepository(LessonProgress)
    private readonly lessonProgressRepository: Repository<LessonProgress>,

    @InjectRepository(UserXp)
    private readonly userXpRepository: Repository<UserXp>,

    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) { }

  /* ======================================================
     MAIN ENTRY
  ====================================================== */

  async getHome(
    userId: string,
    authorization?: string,
  ): Promise<LearnerHomeResponseDto> {
    const [
      profile,
      streak,
      totalXp,
      continueLearning,
      myCourses,
      notifications,
      recommendations,
    ] = await Promise.all([
      this.getUserProfile(userId, authorization).catch(() => null),
      this.getStreak(userId).catch(() => ({ currentStreak: 0 })),
      this.getTotalXp(userId).catch(() => 0),
      this.getContinueLearning(userId).catch(() => null),
      this.getMyCourses(userId).catch(() => []),
      this.getNotifications(userId).catch(() => ({ unreadCount: 0 })),
      this.getRecommendations().catch(() => ({ courses: [] })),
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
     PROFILE (จาก Auth Service) - มีการแคชเบื้องต้น และ fallback เป็น null หากเรียกไม่สำเร็จ
  ====================================================== */

  private async getUserProfile(
    userId: string,
    authorization?: string,
  ): Promise<UserProfile | null> {
    if (!authorization) return null;

    try {
      const authBaseUrl = 'https://api.skillracademy.com/s1/api';

      const response = await this.httpService.axiosRef.get(
        `${authBaseUrl}/users/profile`,
        {
          headers: {
            Authorization: authorization,
          },
        },
      );

      const user = response.data;

      const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();

      return {
        displayName:
          fullName.length > 0
            ? fullName
            : user.username?.trim() || userId,
        avatarUrl: user.avatar ?? null,
      };
    } catch {
      return null;
    }
  }

  /* ======================================================
     STREAK + XP
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
     CONTINUE LEARNING (JOIN ONCE)
  ====================================================== */

  private async getContinueLearning(userId: string) {
    const latest = await this.lessonProgressRepository
      .createQueryBuilder('lp')
      .leftJoinAndSelect('lp.lesson', 'lesson')
      .leftJoinAndSelect('lesson.chapter', 'chapter')
      .leftJoinAndSelect('chapter.level', 'level')
      .leftJoinAndSelect('level.course', 'course')
      .where('lp.userId = :userId', { userId })
      .orderBy('lp.lastViewedAt', 'DESC')
      .getOne();

    if (!latest?.lesson?.chapter?.level?.course) return null;

    const lesson = latest.lesson;
    const chapter = lesson.chapter;
    const level = chapter.level;
    const course = level.course;

    return {
      course_id: course.course_id,
      course_title: course.course_title,
      chapter_title: chapter.chapter_title,
      level_name: level.level_title ?? 'ระดับพื้นฐาน',
      progressPercent: latest.progressPercent ?? 0,
    };
  }

  /* ======================================================
     MY COURSES (NO N+1)
  ====================================================== */

  private async getMyCourses(userId: string) {
    const progressList = await this.lessonProgressRepository
      .createQueryBuilder('lp')
      .leftJoinAndSelect('lp.lesson', 'lesson')
      .leftJoinAndSelect('lesson.chapter', 'chapter')
      .leftJoinAndSelect('chapter.level', 'level')
      .leftJoinAndSelect('level.course', 'course')
      .where('lp.userId = :userId', { userId })
      .getMany();

    if (!progressList.length) return [];

    const courseMap = new Map<
      number,
      { total: number; completed: number; title: string }
    >();

    for (const progress of progressList) {
      const course = progress.lesson?.chapter?.level?.course;
      if (!course) continue;

      if (!courseMap.has(course.course_id)) {
        courseMap.set(course.course_id, {
          total: 0,
          completed: 0,
          title: course.course_title,
        });
      }

      const entry = courseMap.get(course.course_id)!;
      entry.total++;

      if (
        progress.status === 'COMPLETED' ||
        progress.status === 'SKIPPED'
      ) {
        entry.completed++;
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
     NOTIFICATIONS
  ====================================================== */

  private async getNotifications(userId: string) {
    const unreadCount =
      await this.notificationsService.getUnreadCount(userId);
    return { unreadCount };
  }

  /* ======================================================
     RECOMMENDATIONS
  ====================================================== */

  private async getRecommendations() {
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
        course_totalChapter: 6,
      })),
    };
  }
}