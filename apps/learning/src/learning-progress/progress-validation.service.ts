import { Injectable } from '@nestjs/common';
import { ChapterProgressService } from './chapter-progress.service';
import { LessonProgressService } from './lesson-progress.service';
import { LessonProgressStatus } from './entities/lesson-progress.entity';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class ProgressValidationService {
  constructor(
    private readonly chapterProgressService: ChapterProgressService,
    private readonly lessonProgressService: LessonProgressService,
  ) {}

  async validateLessonCompletion(
    userId: number, 
    lessonId: number, 
    chapterId: number
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // ตรวจสอบว่ายังไม่ได้เรียนจบไปก่อนหน้านี้
    const isAlreadyCompleted = await this.lessonProgressService.isLessonCompleted(userId, lessonId);
    if (isAlreadyCompleted) {
      warnings.push('บทเรียนนี้ถูกทำเครื่องหมายว่าเรียนจบไปแล้ว');
    }

    // ตรวจสอบว่าสามารถเรียน Item นี้ได้ (ตามลำดับ)
    const canAccess = await this.canAccessLesson(userId, lessonId, chapterId);
    if (!canAccess) {
      errors.push('ไม่สามารถเข้าถึงบทเรียนนี้ได้ ต้องเรียนบทเรียนก่อนหน้าให้จบก่อน');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async validateChapterProgress(userId: number, chapterId: number): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // ตรวจสอบว่าความคืบหน้าไม่เกิน 100%
      const isValid = await this.chapterProgressService.validateProgressConstraints(userId, chapterId);
      if (!isValid) {
        errors.push('ความคืบหน้าของ Chapter เกิน 100% ถูกปรับแก้แล้ว');
      }

      // ตรวจสอบความสม่ำเสมอของข้อมูล
      const summary = await this.chapterProgressService.getChapterProgressSummary(userId, chapterId);
      const calculatedProgress = Math.round((summary.completedItems / summary.totalItems) * 100);
      
      if (Math.abs(summary.progressPercentage - calculatedProgress) > 1) {
        warnings.push(`ความคืบหน้าไม่สอดคล้องกัน: แสดง ${summary.progressPercentage}%, ควรเป็น ${calculatedProgress}%`);
      }

    } catch (error) {
      errors.push(`ไม่สามารถตรวจสอบความคืบหน้าได้: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async validateVideoProgress(
    userId: number, 
    lessonId: number, 
    currentTime: number, 
    duration: number
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (currentTime < 0 || duration <= 0) {
      errors.push('ข้อมูลเวลาวิดีโอไม่ถูกต้อง');
    }

    if (currentTime > duration) {
      warnings.push('เวลาที่เล่นเกินความยาววิดีโอ');
    }

    // ตรวจสอบว่าไม่ได้ทำเครื่องหมายว่าจบไปก่อนหน้านี้
    const isCompleted = await this.lessonProgressService.isLessonCompleted(userId, lessonId);
    if (isCompleted) {
      warnings.push('วิดีโอนี้ถูกทำเครื่องหมายว่าเรียนจบไปแล้ว');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async canAccessLesson(userId: number, lessonId: number, chapterId: number): Promise<boolean> {
    try {
      const summary = await this.chapterProgressService.getChapterProgressSummary(userId, chapterId);
      const lessonItem = summary.items.find(item => item.lessonId === lessonId);
      
      if (!lessonItem) {
        return false;
      }

      return lessonItem.status !== LessonProgressStatus.LOCKED;
    } catch {
      return false;
    }
  }

  async preventDuplicateProgress(userId: number, lessonId: number): Promise<boolean> {
    const progress = await this.lessonProgressService.getLessonProgress(userId, lessonId);
    
    if (!progress) {
      return true; // ยังไม่มีข้อมูล สามารถสร้างใหม่ได้
    }

    if (progress.status === LessonProgressStatus.COMPLETED) {
      return false; // จบแล้ว ไม่ต้องอัปเดตซ้ำ
    }

    return true; // ยังไม่จบ สามารถอัปเดตได้
  }

  async validateProgressIntegrity(userId: number, chapterId: number): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const summary = await this.chapterProgressService.getChapterProgressSummary(userId, chapterId);
      
      // ตรวจสอบว่ามี Item ที่ completed แต่ items ก่อนหน้าไม่ completed
      let foundCompleted = false;
      let foundIncompleteAfterCompleted = false;
      
      for (const item of summary.items) {
        if (item.status === LessonProgressStatus.COMPLETED) {
          foundCompleted = true;
        } else if (foundCompleted && (item.status === LessonProgressStatus.CURRENT || item.status === LessonProgressStatus.LOCKED)) {
          foundIncompleteAfterCompleted = true;
          break;
        }
      }

      if (foundIncompleteAfterCompleted) {
        warnings.push('พบ Item ที่ยังไม่จบอยู่หลัง Item ที่จบแล้ว อาจมีปัญหาการเรียงลำดับ');
      }

      // ตรวจสอบว่ามีมากกว่า 1 Item ที่เป็น current
      const currentItems = summary.items.filter(item => item.status === LessonProgressStatus.CURRENT);
      if (currentItems.length > 1) {
        errors.push(`พบ Item ปัจจุบันมากกว่า 1 รายการ: ${currentItems.length} รายการ`);
      }

    } catch (error) {
      errors.push(`ไม่สามารถตรวจสอบความสมบูรณ์ของความคืบหน้าได้: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
