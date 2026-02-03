import { Injectable } from '@nestjs/common';
import { ChapterProgressService } from './chapter-progress.service';
import { LessonProgressService } from './lesson-progress.service';
import { CheckpointService } from './checkpoint.service';
import { ProgressValidationService } from './progress-validation.service';
import { LessonProgressStatus } from './entities/lesson-progress.entity';

export interface GamificationProgress {
  chapterId: number;
  progressPercentage: number;
  totalItems: number;
  completedItems: number;
  currentItem?: number;
  nextAvailableItem?: number;
  checkpointStatus?: {
    isUnlocked: boolean;
    progress: number;
  };
}

export interface ItemStatus {
  lessonId: number;
  status: LessonProgressStatus;
  progressPercentage: number;
  isAccessible: boolean;
  canSkip: boolean;
}

@Injectable()
export class GamificationService {
  constructor(
    private readonly chapterProgressService: ChapterProgressService,
    private readonly lessonProgressService: LessonProgressService,
    private readonly checkpointService: CheckpointService,
    private readonly validationService: ProgressValidationService,
  ) {}

  async getChapterGamificationProgress(
    userId: number,
    chapterId: number,
  ): Promise<GamificationProgress> {
    // ดึงข้อมูลความคืบหน้า Chapter
    const summary = await this.chapterProgressService.getChapterProgressSummary(
      userId,
      chapterId,
    );

    // หา Item ปัจจุบันและถัดไป
    const currentItem = summary.items.find(
      (item) => item.status === LessonProgressStatus.CURRENT,
    );
    const nextAvailableItem =
      await this.chapterProgressService.getNextAvailableItem(userId, chapterId);

    // ตรวจสอบสถานะ Checkpoint (ถ้ามี)
    let checkpointStatus;
    const checkpointItems = summary.items.filter((item) => {
      // สมมติว่า checkpoint มี ID ที่ลงท้ายด้วย 999 หรือมีการระบุพิเศษ
      return item.lessonId.toString().endsWith('999');
    });

    if (checkpointItems.length > 0) {
      const checkpointItem = checkpointItems[0];
      const precedingItems = summary.items.filter(
        (item) => item.lessonId !== checkpointItem.lessonId,
      );

      const checkpointProgress =
        await this.checkpointService.getCheckpointProgress(
          userId,
          precedingItems.map((item) => item.lessonId),
        );

      checkpointStatus = {
        isUnlocked: checkpointProgress.percentage === 100,
        progress: checkpointProgress.percentage,
      };
    }

    return {
      chapterId,
      progressPercentage: summary.progressPercentage,
      totalItems: summary.totalItems,
      completedItems: summary.completedItems,
      currentItem: currentItem?.lessonId,
      nextAvailableItem: nextAvailableItem || undefined,
      checkpointStatus,
    };
  }

  async completeLessonWithGamification(
    userId: number,
    lessonId: number,
    chapterId: number,
  ): Promise<{
    success: boolean;
    chapterProgress: GamificationProgress;
    validation: any;
  }> {
    // ตรวจสอบความถูกต้องก่อนทำการ complete
    const validation = await this.validationService.validateLessonCompletion(
      userId,
      lessonId,
      chapterId,
    );

    if (!validation.isValid) {
      const currentProgress = await this.getChapterGamificationProgress(
        userId,
        chapterId,
      );
      return {
        success: false,
        chapterProgress: currentProgress,
        validation,
      };
    }

    // ทำเครื่องหมายว่าเรียนจบ
    await this.lessonProgressService.completeLesson(userId, lessonId);

    // อัปเดตความคืบหน้า Chapter
    await this.chapterProgressService.updateChapterProgress(userId, chapterId);

    // ดึงข้อมูลความคืบหน้าล่าสุด
    const chapterProgress = await this.getChapterGamificationProgress(
      userId,
      chapterId,
    );

    return {
      success: true,
      chapterProgress,
      validation,
    };
  }

  async skipQuizWithGamification(
    userId: number,
    quizLessonId: number,
    chapterId: number,
  ): Promise<{
    success: boolean;
    chapterProgress: GamificationProgress;
  }> {
    // ทำเครื่องหมายว่าข้าม Quiz (แต่ยังคงนับความคืบหน้า)
    await this.lessonProgressService.skipLesson(userId, quizLessonId);

    // อัปเดตความคืบหน้า Chapter
    await this.chapterProgressService.updateChapterProgress(userId, chapterId);

    // ดึงข้อมูลความคืบหน้าล่าสุด
    const chapterProgress = await this.getChapterGamificationProgress(
      userId,
      chapterId,
    );

    return {
      success: true,
      chapterProgress,
    };
  }

  async updateVideoProgressWithGamification(
    userId: number,
    videoLessonId: number,
    chapterId: number,
    currentTime: number,
    duration: number,
  ): Promise<{
    success: boolean;
    chapterProgress: GamificationProgress;
    isCompleted: boolean;
  }> {
    // ตรวจสอบความถูกต้อง
    const validation = await this.validationService.validateVideoProgress(
      userId,
      videoLessonId,
      currentTime,
      duration,
    );

    if (!validation.isValid) {
      const currentProgress = await this.getChapterGamificationProgress(
        userId,
        chapterId,
      );
      return {
        success: false,
        chapterProgress: currentProgress,
        isCompleted: false,
      };
    }

    // อัปเดตความคืบหน้าวิดีโอ
    await this.lessonProgressService.updateVideoProgress(
      userId,
      videoLessonId,
      currentTime,
      duration,
    );

    let isCompleted = false;

    // ถ้าเล่นจนจบ (95% ขึ้นไป) ให้ทำเครื่องหมายว่าเรียนจบ
    if (currentTime >= duration * 0.95) {
      await this.lessonProgressService.completeLesson(userId, videoLessonId);
      isCompleted = true;
    }

    // อัปเดตความคืบหน้า Chapter (ถ้าจบวิดีโอ)
    if (isCompleted) {
      await this.chapterProgressService.updateChapterProgress(
        userId,
        chapterId,
      );
    }

    // ดึงข้อมูลความคืบหน้าล่าสุด
    const chapterProgress = await this.getChapterGamificationProgress(
      userId,
      chapterId,
    );

    return {
      success: true,
      chapterProgress,
      isCompleted,
    };
  }

  async getChapterRoadmap(
    userId: number,
    chapterId: number,
  ): Promise<{
    chapterProgress: GamificationProgress;
    items: ItemStatus[];
  }> {
    const chapterProgress = await this.getChapterGamificationProgress(
      userId,
      chapterId,
    );
    const summary = await this.chapterProgressService.getChapterProgressSummary(
      userId,
      chapterId,
    );

    const items: ItemStatus[] = summary.items.map((item) => ({
      lessonId: item.lessonId,
      status: item.status,
      progressPercentage: item.progressPercentage,
      isAccessible: item.status !== LessonProgressStatus.LOCKED,
      canSkip:
        item.status === LessonProgressStatus.CURRENT &&
        // สมมติว่า Quiz สามารถข้ามได้
        item.lessonId.toString().startsWith('quiz_'),
    }));

    return {
      chapterProgress,
      items,
    };
  }

  async validateOverallProgress(
    userId: number,
    chapterId: number,
  ): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const chapterValidation =
      await this.validationService.validateChapterProgress(userId, chapterId);
    const integrityValidation =
      await this.validationService.validateProgressIntegrity(userId, chapterId);

    const allIssues = [
      ...chapterValidation.errors,
      ...integrityValidation.errors,
    ];
    const allRecommendations = [
      ...chapterValidation.warnings,
      ...integrityValidation.warnings,
    ];

    return {
      isValid: allIssues.length === 0,
      issues: allIssues,
      recommendations: allRecommendations,
    };
  }

  async resetChapterProgress(userId: number, chapterId: number): Promise<void> {
    // ดึงรายการ Item ทั้งหมดใน Chapter
    const summary = await this.chapterProgressService.getChapterProgressSummary(
      userId,
      chapterId,
    );

    // ลบความคืบหน้าของแต่ละ Item
    for (const item of summary.items) {
      await this.lessonProgressService.resetLessonProgress(
        userId,
        item.lessonId,
      );
    }

    // รีเซ็ตความคืบหน้า Chapter
    await this.chapterProgressService.updateChapterProgress(userId, chapterId);
  }
}
