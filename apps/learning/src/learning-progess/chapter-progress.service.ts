import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ChapterProgress } from './entities/chapter-progress.entity';
import { LessonProgress, LessonProgressStatus } from './entities/lesson-progress.entity';

export interface ChapterProgressSummary {
  chapterId: number;
  progressPercentage: number;
  totalItems: number;
  completedItems: number;
  items: {
    lessonId: number;
    status: LessonProgressStatus;
    progressPercentage: number;
  }[];
}

@Injectable()
export class ChapterProgressService {
  constructor(
    @InjectRepository(ChapterProgress)
    private readonly chapterProgressRepository: Repository<ChapterProgress>,
    @InjectRepository(LessonProgress)
    private readonly lessonProgressRepository: Repository<LessonProgress>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
  ) {}

  async calculateChapterProgress(userId: number, chapterId: number): Promise<number> {
    const lessons = await this.lessonRepository.find({
      where: { chapter_id: chapterId },
      order: { orderIndex: 'ASC' }
    });

    if (lessons.length === 0) return 0;

    const completedLessons = await this.lessonProgressRepository.count({
      where: {
        userId,
        status: LessonProgressStatus.COMPLETED,
        lessonId: lessons.map(l => l.lesson_id)
      }
    });

    return Math.round((completedLessons / lessons.length) * 100);
  }

  async updateChapterProgress(userId: number, chapterId: number): Promise<ChapterProgress> {
    const lessons = await this.lessonRepository.find({
      where: { chapter_id: chapterId }
    });

    const completedItems = await this.lessonProgressRepository.count({
      where: {
        userId,
        status: LessonProgressStatus.COMPLETED,
        lessonId: lessons.map(l => l.lesson_id)
      }
    });

    const progressPercentage = lessons.length > 0 ? Math.round((completedItems / lessons.length) * 100) : 0;

    let chapterProgress = await this.chapterProgressRepository.findOne({
      where: { userId, chapterId }
    });

    if (!chapterProgress) {
      chapterProgress = this.chapterProgressRepository.create({
        userId,
        chapterId,
        progressPercentage,
        totalItems: lessons.length,
        completedItems,
        lastUpdated: new Date()
      });
    } else {
      chapterProgress.progressPercentage = progressPercentage;
      chapterProgress.totalItems = lessons.length;
      chapterProgress.completedItems = completedItems;
      chapterProgress.lastUpdated = new Date();
    }

    return this.chapterProgressRepository.save(chapterProgress);
  }

  async getChapterProgressSummary(userId: number, chapterId: number): Promise<ChapterProgressSummary> {
    const lessons = await this.lessonRepository.find({
      where: { chapter_id: chapterId },
      order: { orderIndex: 'ASC' }
    });

    const lessonProgresses = await this.lessonProgressRepository.find({
      where: {
        userId,
        lessonId: lessons.map(l => l.lesson_id)
      }
    });

    const items = lessons.map(lesson => {
      const progress = lessonProgresses.find(p => p.lessonId === lesson.lesson_id);
      return {
        lessonId: lesson.lesson_id,
        status: progress?.status || LessonProgressStatus.LOCKED,
        progressPercentage: progress?.progressPercentage || 0
      };
    });

    // กำหนดสถานะ current/locked ตามลำดับ
    let hasCurrent = false;
    for (let i = 0; i < items.length; i++) {
      if (items[i].status === LessonProgressStatus.COMPLETED) {
        continue;
      }
      if (!hasCurrent) {
        items[i].status = LessonProgressStatus.CURRENT;
        hasCurrent = true;
      } else {
        items[i].status = LessonProgressStatus.LOCKED;
      }
    }

    const completedItems = items.filter(item => item.status === LessonProgressStatus.COMPLETED).length;
    const progressPercentage = lessons.length > 0 ? Math.round((completedItems / lessons.length) * 100) : 0;

    return {
      chapterId,
      progressPercentage,
      totalItems: lessons.length,
      completedItems,
      items
    };
  }

  async getNextAvailableItem(userId: number, chapterId: number): Promise<number | null> {
    const summary = await this.getChapterProgressSummary(userId, chapterId);
    const currentItem = summary.items.find(item => item.status === LessonProgressStatus.CURRENT);
    return currentItem?.lessonId || null;
  }

  async validateProgressConstraints(userId: number, chapterId: number): Promise<boolean> {
    const progress = await this.chapterProgressRepository.findOne({
      where: { userId, chapterId }
    });

    if (!progress) return true;

    // ตรวจสอบว่า progress ไม่เกิน 100%
    if (progress.progressPercentage > 100) {
      progress.progressPercentage = 100;
      await this.chapterProgressRepository.save(progress);
      return false;
    }

    return true;
  }

  async isCheckpointUnlocked(userId: number, chapterId: number): Promise<boolean> {
    const lessons = await this.lessonRepository.find({
      where: { 
        chapter_id: chapterId,
        lesson_type: 'checkpoint'
      }
    });

    if (lessons.length === 0) return true;

    const checkpoint = lessons[0];
    const precedingLessons = await this.lessonRepository.find({
      where: {
        chapter_id: chapterId,
        orderIndex: { $lt: checkpoint.orderIndex }
      }
    });

    const completedPreceding = await this.lessonProgressRepository.count({
      where: {
        userId,
        status: LessonProgressStatus.COMPLETED,
        lessonId: precedingLessons.map(l => l.lesson_id)
      }
    });

    return completedPreceding === precedingLessons.length;
  }
}
