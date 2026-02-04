import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LessonProgress } from './entities/lesson-progress.entity';
import { CourseClientService } from './course-client.service';

export type ProgressSummary = {
  totalCompleted: number;
  streakDays: number;
  lastCompletedAt?: Date;
};

@Injectable()
export class LearningProgressService {
  constructor(

    // 🔹 learning DB
    @InjectRepository(LessonProgress, 'learning')
    private readonly progressRepo: Repository<LessonProgress>,

    private readonly courseClient: CourseClientService,

  ) { }

  async completeLesson(
    userId: string,
    lessonId: string,
  ): Promise<LessonProgress> {
    const now = new Date();

    const numericLessonId = Number(lessonId);
    if (!Number.isFinite(numericLessonId)) {
      throw new BadRequestException('Invalid lesson id');
    }

    const lesson = await this.courseClient.getLessonById(numericLessonId);
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    let progress = await this.progressRepo.findOne({
      where: { userId, lessonId: numericLessonId },
    });

    if (!progress) {
      progress = this.progressRepo.create({
        userId,
        lessonId: numericLessonId,
        completedAt: now,
      });
    } else {
      progress.completedAt = now;
    }

    return this.progressRepo.save(progress);
  }

  async getLessonProgress(
    userId: string,
    lessonId: string,
  ): Promise<LessonProgress | null> {
    const numericLessonId = Number(lessonId);
    if (!Number.isFinite(numericLessonId)) {
      throw new BadRequestException('Invalid lesson id');
    }
    return this.progressRepo.findOne({
      where: { userId, lessonId: numericLessonId },
    });
  }

  async getSummary(userId: string): Promise<ProgressSummary> {
    const completions = await this.progressRepo
      .createQueryBuilder('lesson_progress')
      .where('lesson_progress.user_id = :userId', { userId })
      .orderBy('lesson_progress.completed_at', 'DESC')
      .getMany();

    const totalCompleted = completions.length;
    const lastCompletedAt = completions[0]?.completedAt;

    const uniqueDays = new Set(
      completions.map(p =>
        p.completedAt.toISOString().slice(0, 10),
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
