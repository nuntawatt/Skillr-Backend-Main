import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  LessonProgress,
  LessonProgressStatus,
} from './entities/lesson-progress.entity';
import { LessonProgressService } from './lesson-progress.service';

export interface CheckpointStatus {
  isUnlocked: boolean;
  completedItems: number;
  totalRequiredItems: number;
  nextRequiredItem?: number;
}

@Injectable()
export class CheckpointService {
  constructor(private readonly lessonProgressService: LessonProgressService) {}

  async checkCheckpointUnlock(
    userId: number,
    chapterId: number,
    checkpointLessonId: number,
    precedingLessonIds: number[],
  ): Promise<CheckpointStatus> {
    const completedCount =
      await this.lessonProgressService.getCompletedLessonsCount(
        userId,
        precedingLessonIds,
      );

    const isUnlocked = completedCount === precedingLessonIds.length;

    let nextRequiredItem: number | undefined;
    if (!isUnlocked && precedingLessonIds.length > 0) {
      // หา Item ถัดไปที่ยังไม่เรียนจบ
      const progresses = await this.lessonProgressService.getLessonsProgress(
        userId,
        precedingLessonIds,
      );

      for (const lessonId of precedingLessonIds) {
        const progress = progresses.find((p) => p.lessonId === lessonId);
        if (!progress || progress.status !== LessonProgressStatus.COMPLETED) {
          nextRequiredItem = lessonId;
          break;
        }
      }
    }

    return {
      isUnlocked,
      completedItems: completedCount,
      totalRequiredItems: precedingLessonIds.length,
      nextRequiredItem,
    };
  }

  async unlockCheckpoint(
    userId: number,
    checkpointLessonId: number,
  ): Promise<void> {
    await this.lessonProgressService.updateLessonProgress(
      userId,
      checkpointLessonId,
      {
        status: LessonProgressStatus.CURRENT,
        progressPercentage: 0,
      },
    );
  }

  async canAccessCheckpoint(
    userId: number,
    checkpointLessonId: number,
    precedingLessonIds: number[],
  ): Promise<boolean> {
    const status = await this.checkCheckpointUnlock(
      userId,
      0, // chapterId ไม่จำเป็นสำหรับการตรวจสอบนี้
      checkpointLessonId,
      precedingLessonIds,
    );

    return status.isUnlocked;
  }

  async getCheckpointProgress(
    userId: number,
    precedingLessonIds: number[],
  ): Promise<{
    percentage: number;
    completed: number;
    total: number;
  }> {
    const completed = await this.lessonProgressService.getCompletedLessonsCount(
      userId,
      precedingLessonIds,
    );

    const total = precedingLessonIds.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      percentage,
      completed,
      total,
    };
  }
}
