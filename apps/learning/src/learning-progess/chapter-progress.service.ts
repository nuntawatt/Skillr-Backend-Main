import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChapterProgress } from './entities/chapter-progress.entity';
import { LessonProgress } from './entities/lesson-progress.entity';
import { LessonProgressStatus } from './entities/lesson-progress.entity';
import { In } from 'typeorm';

// Interface for chapter progress summary
export interface ChapterProgressSummary {
  chapterId: number;
  progressPercentage: number;
  totalItems: number;
  completedItems: number;
  items: Array<{
    lessonId: number;
    status: LessonProgressStatus;
    progressPercentage: number;
  }>;
}

// Mock lesson data interface (since we don't have direct access to Lesson entity)
interface MockLesson {
  lesson_id: number;
  chapter_id: number;
  orderIndex: number;
}

@Injectable()
export class ChapterProgressService {
  constructor(
    @InjectRepository(ChapterProgress)
    private readonly chapterProgressRepository: Repository<ChapterProgress>,
    @InjectRepository(LessonProgress)
    private readonly lessonProgressRepository: Repository<LessonProgress>,
  ) {}

  // Mock method to get lessons - in real implementation, this would query the Lesson entity
  private async getLessonsByChapter(chapterId: number): Promise<MockLesson[]> {
    // This is a mock implementation - in real code, you would inject LessonRepository
    // For now, we'll return empty array to avoid errors
    console.warn('Lesson repository not available - using mock data');
    return [];
  }

  async calculateChapterProgress(userId: number, chapterId: number): Promise<number> {
    const lessons = await this.getLessonsByChapter(chapterId);

    if (lessons.length === 0) return 0;

    const completedLessons = await this.lessonProgressRepository.count({
      where: {
        userId,
        status: LessonProgressStatus.COMPLETED,
        lessonId: In(lessons.map(l => l.lesson_id))
      }
    });

    return Math.round((completedLessons / lessons.length) * 100);
  }

  async updateChapterProgress(userId: number, chapterId: number): Promise<ChapterProgress> {
    const lessons = await this.getLessonsByChapter(chapterId);
    const progressPercentage = await this.calculateChapterProgress(userId, chapterId);
    
    // Calculate completed items
    const completedLessons = await this.lessonProgressRepository.count({
      where: {
        userId,
        status: LessonProgressStatus.COMPLETED,
        lessonId: In(lessons.map(l => l.lesson_id))
      }
    });
    
    // Update or create chapter progress record
    let chapterProgress = await this.chapterProgressRepository.findOne({
      where: { userId, chapterId }
    });

    if (!chapterProgress) {
      chapterProgress = this.chapterProgressRepository.create({
        userId,
        chapterId,
        progressPercentage,
        totalItems: lessons.length,
        completedItems: completedLessons,
        lastUpdated: new Date()
      });
    } else {
      // Update existing record
      chapterProgress.progressPercentage = progressPercentage;
      chapterProgress.totalItems = lessons.length;
      chapterProgress.completedItems = completedLessons;
      chapterProgress.lastUpdated = new Date();
    }

    return this.chapterProgressRepository.save(chapterProgress);
  }

  async getChapterProgressSummary(userId: number, chapterId: number): Promise<ChapterProgressSummary> {
    const lessons = await this.getLessonsByChapter(chapterId);

    const lessonProgresses = await this.lessonProgressRepository.find({
      where: {
        userId,
        lessonId: In(lessons.map(l => l.lesson_id))
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

    // Determine current/locked status based on sequence
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

    // Ensure progress never exceeds 100%
    if (progress.progressPercentage > 100) {
      progress.progressPercentage = 100;
      await this.chapterProgressRepository.save(progress);
      return false;
    }

    return true;
  }

  async isCheckpointUnlocked(userId: number, chapterId: number): Promise<boolean> {
    const lessons = await this.getLessonsByChapter(chapterId);
    
    // Find checkpoint lesson (assuming it's the last lesson in the chapter)
    const checkpoint = lessons[lessons.length - 1];
    if (!checkpoint) return false;

    // Check if all preceding lessons are completed
    const precedingLessons = lessons.slice(0, -1);
    const completedPreceding = await this.lessonProgressRepository.count({
      where: {
        userId,
        status: LessonProgressStatus.COMPLETED,
        lessonId: In(precedingLessons.map(l => l.lesson_id))
      }
    });

    return completedPreceding === precedingLessons.length;
  }
}
