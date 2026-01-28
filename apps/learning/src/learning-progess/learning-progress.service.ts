import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { LessonProgress } from './entities/lesson-progress.entity';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ChapterRoadmapDto } from './dto/learning-progress.dto';

export type ProgressSummary = {
  totalCompleted: number;
  streakDays: number;
  lastCompletedAt?: Date;
};

@Injectable()
export class LearningProgressService {
  private readonly courseServiceUrl = process.env.COURSE_SERVICE_URL ?? 'http://localhost:3001';

  constructor(
    @InjectRepository(LessonProgress)
    private readonly progressRepository: Repository<LessonProgress>,
    private readonly httpService: HttpService,
  ) {}

  async completeLesson(
    userId: string,
    lessonId: string,
  ): Promise<LessonProgress> {
    const numericUserId = Number(userId);
    const numericLessonId = Number(lessonId);
    const now = new Date();

    let progress = await this.progressRepository.findOne({
      where: { userId: numericUserId, lessonId: numericLessonId },
    });

    if (!progress) {
      progress = this.progressRepository.create({
        userId: numericUserId,
        lessonId: numericLessonId,
        completedAt: now,
      });
    } else {
      progress.completedAt = now;
    }

    return this.progressRepository.save(progress);
  }

  async saveLessonProgress(
    userId: string,
    lessonId: string,
    lastReadCardIndex: number,
    isCompleted?: boolean,
  ): Promise<LessonProgress> {
    const numericUserId = Number(userId);
    const numericLessonId = Number(lessonId);
    const now = new Date();

    let progress = await this.progressRepository.findOne({
      where: { userId: numericUserId, lessonId: numericLessonId },
    });

    if (!progress) {
      progress = this.progressRepository.create({
        userId: numericUserId,
        lessonId: numericLessonId,
        lastReadCardIndex,
        completedAt: isCompleted ? now : null,
      });
    } else {
      progress.lastReadCardIndex = lastReadCardIndex;
      if (isCompleted && !progress.completedAt) {
        progress.completedAt = now;
      }
    }

    return this.progressRepository.save(progress);
  }

  async getLessonProgress(
    userId: string,
    lessonId: string,
  ): Promise<LessonProgress | null> {
    const numericUserId = Number(userId);
    const numericLessonId = Number(lessonId);
    return this.progressRepository.findOne({
      where: { userId: numericUserId, lessonId: numericLessonId },
    });
  }

  async getSummary(userId: string): Promise<ProgressSummary> {
    const numericUserId = Number(userId);

    const completions = await this.progressRepository.find({
      where: { userId: numericUserId },
      order: { completedAt: 'DESC' },
    });

    const completedOnly = completions.filter((p) => p.completedAt !== null);

    const totalCompleted = completedOnly.length;
    const lastCompletedAt = completedOnly[0]?.completedAt ?? undefined;
    const uniqueDays = new Set<string>(
      completedOnly.map((progress) =>
        progress.completedAt!.toISOString().slice(0, 10),
      ),
    );

    const streakDays = this.calculateStreak(uniqueDays);

    return {
      totalCompleted,
      streakDays,
      lastCompletedAt,
    };
  }

  private calculateStreak(uniqueDays: Set<string>): number {
    if (!uniqueDays.size) {
      return 0;
    }

    let streak = 0;
    const cursor = new Date();
    while (true) {
      const currentDay = cursor.toISOString().slice(0, 10);
      if (!uniqueDays.has(currentDay)) {
        break;
      }
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    return streak;
  }

  async getChapterRoadmap(userId: string, chapterId: string): Promise<ChapterRoadmapDto> {
    const numericUserId = Number(userId);
    const numericChapterId = Number(chapterId);

    // 1. Fetch chapter and lessons from course service
    const chapterResponse = await firstValueFrom(
      this.httpService.get(`${this.courseServiceUrl}/chapters/${chapterId}`)
    ).then(res => res.data).catch(err => {
      console.error('Failed to fetch chapter from course service:', err.message);
      throw new NotFoundException(`Chapter ${chapterId} not found or course service error`);
    });

    const lessons = chapterResponse.lessons || [];

    // 2. Fetch user progress for these lessons
    const lessonIds = lessons.map(l => l.id);
    let progressList: LessonProgress[] = [];
    if (lessonIds.length > 0) {
      progressList = await this.progressRepository.find({
        where: { userId: numericUserId, lessonId: In(lessonIds) }
      });
    }
    const progressMap = new Map(progressList.map(p => [p.lessonId, p]));

    // 3. Map to RoadmapItemDto and determine status
    // Ensure checkpoint is at the end if it exists (AC3)
    const sortedLessons = [...lessons].sort((a, b) => {
      if (a.type === 'checkpoint' && b.type !== 'checkpoint') return 1;
      if (a.type !== 'checkpoint' && b.type === 'checkpoint') return -1;
      return a.order_index - b.order_index;
    });

    let foundCurrent = false;
    const items = sortedLessons.map((lesson) => {
      const progress = progressMap.get(lesson.id);
      const isCompleted = !!progress?.completedAt;

      let status: 'completed' | 'current' | 'locked' = 'locked';
      if (isCompleted) {
        status = 'completed';
      } else if (!foundCurrent) {
        status = 'current';
        foundCurrent = true;
      }

      return {
        id: lesson.id,
        title: lesson.title,
        type: lesson.type,
        status,
        orderIndex: lesson.orderIndex,
        icon: this.mapIcon(lesson.type)
      };
    });

    return {
      chapterId: numericChapterId,
      chapterTitle: chapterResponse.chapter_title,
      items
    };
  }

  private mapIcon(type: string): string {
    switch (type) {
      case 'video': return 'play';
      case 'article': return 'document';
      case 'quiz': return 'pencil';
      case 'checkpoint': return 'trophy';
      default: return 'document';
    }
  }
}
