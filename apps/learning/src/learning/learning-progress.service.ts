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

    const totalCompleted = completions.length;
    const lastCompletedAt = completions[0]?.completedAt;
    const uniqueDays = new Set<string>(
      completions.map((progress) =>
        progress.completedAt.toISOString().slice(0, 10),
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
