import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { StreakService } from '../streaks/streak.service';
import { ProgressService } from '../progress/progress.service';
import { LessonProgress } from '../progress/entities/progress.entity';
import { UserXp } from '../quizs/entities/user-xp.entity';
import { Lesson } from '../lessons/entities/lesson.entity';
import { Chapter } from '../chapters/entities/chapter.entity';
import { Course } from '../courses/entities/course.entity';
import { Level } from '../levels/entities/level.entity';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { NotificationsService } from '../notifications/notifications.service';

import { LearnerHomeResponseDto } from './dto/learner-home-response.dto';

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
  avatar_media_id?: string | null;
}

@Injectable()
export class LearnerHomeService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly streakService: StreakService,
    private readonly progressService: ProgressService,
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
  async getHome(userId: string): Promise<LearnerHomeResponseDto> {
    const [profile, streak, totalXp, continueLearning, myCourses, notifications] = await Promise.all([
      this.getUserProfile(userId).catch(() => null),
      this.getStreak(userId).catch(() => ({ currentStreak: 0, longestStreak: 0 })),
      this.getTotalXp(userId).catch(() => 0),
      this.getContinueLearning(userId).catch(() => null),
      this.getMyCourses(userId).catch(() => []),
      this.getNotifications(userId).catch(() => ({ unreadCount: 0 })),
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
    };
  }

  private async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const authBaseUrl = this.configService.get<string>('AUTH_BASE_URL', 'http://localhost:3001');
      
      // Try to get user profile from auth service
      const response = await this.httpService.axiosRef.get(`${authBaseUrl}/users/profile`, {
        headers: {
          // In real implementation, you'd pass the JWT token from the request
          // For now, we'll make a direct call assuming same database
          'Authorization': `Bearer ${this.configService.get<string>('JWT_SECRET', 'demo-token')}`
        }
      });
      
      const user: UserResponse = response.data;
      return {
        displayName: (user.firstName && user.lastName) ? `${user.firstName} ${user.lastName}` : (user.username ?? null),
        avatarUrl: user.avatar ?? null,
      };
    } catch (error) {
      // If auth service is not available or fails, return null
      console.warn('Failed to fetch user profile from auth service:', error.message);
      
      // Fallback: try to get user from database directly (if sharing same database)
      try {
        // This would require importing User entity and repository
        // For now, return null to avoid breaking the app
        return null;
      } catch (fallbackError) {
        console.warn('Fallback user fetch also failed:', fallbackError.message);
        return null;
      }
    }
  }

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

  private async getContinueLearning(userId: string) {
    // Find the most recently accessed lesson that is still IN_PROGRESS or not COMPLETED
    const latestProgress = await this.lessonProgressRepository.findOne({
      where: { userId },
      order: { lastViewedAt: 'DESC' },
      relations: ['lesson'],
    });

    if (!latestProgress?.lesson) return null;

    // If status is LOCKED or already COMPLETED, try to find the next available lesson
    if (latestProgress.status === 'LOCKED' || latestProgress.status === 'COMPLETED') {
      const nextLesson = await this.findNextAvailableLesson(userId, latestProgress.lessonId);
      if (!nextLesson) return null;
      return this.buildContinueLearningDto(nextLesson, null);
    }

    return this.buildContinueLearningDto(latestProgress.lesson, latestProgress);
  }

  private async findNextAvailableLesson(userId: string, currentLessonId: number) {
    const current = await this.lessonRepository.findOne({ where: { lesson_id: currentLessonId } });
    if (!current) return null;

    // Try next lesson in same chapter
    const nextLesson = await this.lessonRepository.findOne({
      where: { chapter_id: current.chapter_id, orderIndex: current.orderIndex + 1 },
    });

    if (!nextLesson) return null;

    const nextProgress = await this.lessonProgressRepository.findOne({
      where: { userId, lessonId: nextLesson.lesson_id },
    });

    // Only return if not LOCKED
    if (!nextProgress || nextProgress.status === 'LOCKED') return null;

    return { lesson: nextLesson, progress: nextProgress };
  }

  private async getMyCourses(userId: string) {
    // Optimized: Get all progress with lesson relations in one query
    const allProgress = await this.lessonProgressRepository.find({
      where: { userId },
      relations: ['lesson'],
      order: { lastViewedAt: 'DESC' },
    });

    if (!allProgress.length) return [];

    // Collect all unique chapter and level IDs to batch fetch
    const chapterIds = new Set<number>();
    const levelIds = new Set<number>();
    const courseIds = new Set<number>();
    
    for (const progress of allProgress) {
      if (!progress.lesson) continue;
      chapterIds.add(progress.lesson.chapter_id);
    }

    // Batch fetch chapters
    const chapters = await this.chapterRepository.find({
      where: { chapter_id: In([...chapterIds]) },
    });
    
    // Collect level IDs from chapters
    for (const chapter of chapters) {
      levelIds.add(chapter.levelId);
    }

    // Batch fetch levels
    const levels = await this.levelRepository.find({
      where: { level_id: In([...levelIds]) },
    });
    
    // Collect course IDs from levels
    for (const level of levels) {
      courseIds.add(level.course_id);
    }

    // Batch fetch courses
    const courses = await this.courseRepository.find({
      where: { course_id: In([...courseIds]) },
    });

    // Create lookup maps
    const chapterMap = new Map(chapters.map(c => [c.chapter_id, c]));
    const levelMap = new Map(levels.map(l => [l.level_id, l]));
    const courseMap = new Map(courses.map(c => [c.course_id, c]));

    // Group by course and calculate progress
    const courseProgressMap = new Map<number, {
      courseId: number;
      courseTitle: string;
      totalLessons: number;
      completedLessons: number;
      lastAccessedAt: Date;
    }>();

    for (const progress of allProgress) {
      if (!progress.lesson) continue;

      const chapter = chapterMap.get(progress.lesson.chapter_id);
      if (!chapter) continue;

      const level = levelMap.get(chapter.levelId);
      if (!level) continue;

      const course = courseMap.get(level.course_id);
      if (!course) continue;

      const courseId = course.course_id;
      if (!courseProgressMap.has(courseId)) {
        courseProgressMap.set(courseId, {
          courseId,
          courseTitle: course.course_title,
          totalLessons: 0,
          completedLessons: 0,
          lastAccessedAt: progress.lastViewedAt || progress.updatedAt,
        });
      }

      const courseData = courseProgressMap.get(courseId)!;
      courseData.totalLessons += 1;
      
      if (progress.status === 'COMPLETED' || progress.status === 'SKIPPED') {
        courseData.completedLessons += 1;
      }

      // Update last accessed time
      const progressTime = progress.lastViewedAt || progress.updatedAt;
      if (progressTime > courseData.lastAccessedAt) {
        courseData.lastAccessedAt = progressTime;
      }
    }

    // Convert to array and sort by progress (descending), then by courseId
    return Array.from(courseProgressMap.values())
      .map(course => ({
        courseId: course.courseId,
        title: course.courseTitle,
        progressPercent: course.totalLessons > 0 
          ? Math.round((course.completedLessons / course.totalLessons) * 100)
          : 0,
      }))
      .sort((a, b) => {
        if (b.progressPercent !== a.progressPercent) {
          return b.progressPercent - a.progressPercent;
        }
        return a.courseId - b.courseId;
      });
  }

  private async getNotifications(userId: string) {
    const unreadCount = await this.notificationsService.getUnreadCount(userId);
    return { unreadCount };
  }

  private async buildContinueLearningDto(
    lessonOrResult: Lesson | { lesson: Lesson; progress: LessonProgress | null },
    progress: LessonProgress | null,
  ) {
    const lesson = 'lesson' in lessonOrResult ? lessonOrResult.lesson : lessonOrResult;
    const actualProgress = 'lesson' in lessonOrResult ? lessonOrResult.progress : progress;

    const chapter = await this.chapterRepository.findOne({ where: { chapter_id: lesson.chapter_id } });
    if (!chapter) return null;

    const level = await this.levelRepository.findOne({ where: { level_id: chapter.levelId } });
    const course = level ? await this.courseRepository.findOne({ where: { course_id: level.course_id } }) : null;

    if (!course) return null;

    return {
      courseId: course.course_id,
      courseTitle: course.course_title,
      lessonId: lesson.lesson_id,
      lessonTitle: lesson.lesson_title,
      progressPercent: actualProgress?.progressPercent ?? 0,
    };
  }
}
