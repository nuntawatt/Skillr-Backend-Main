import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LessonProgress } from './entities/lesson-progress.entity';

export type ProgressSummary = {
  totalCompleted: number;
  streakDays: number;
  lastCompletedAt?: Date;
};

@Injectable()
export class LearningProgressService {
  constructor(
    @InjectRepository(LessonProgress)
    private readonly progressRepository: Repository<LessonProgress>,
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
}
