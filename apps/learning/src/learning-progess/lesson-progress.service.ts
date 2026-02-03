import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { LessonProgress, LessonProgressStatus } from './entities/lesson-progress.entity';

export interface LessonProgressUpdate {
  status?: LessonProgressStatus;
  progressPercentage?: number;
  timeSpent?: number;
  isSkipped?: boolean;
}

@Injectable()
export class LessonProgressService {
  constructor(
    @InjectRepository(LessonProgress)
    private readonly progressRepository: Repository<LessonProgress>,
  ) {}

  async completeLesson(userId: number, lessonId: number): Promise<LessonProgress> {
    return this.updateLessonProgress(userId, lessonId, {
      status: LessonProgressStatus.COMPLETED,
      progressPercentage: 100,
      completedAt: new Date()
    });
  }

  async skipLesson(userId: number, lessonId: number): Promise<LessonProgress> {
    return this.updateLessonProgress(userId, lessonId, {
      status: LessonProgressStatus.COMPLETED,
      isSkipped: true,
      progressPercentage: 100,
      completedAt: new Date()
    });
  }

  async updateLessonProgress(
    userId: number, 
    lessonId: number, 
    updates: Partial<LessonProgressUpdate & { completedAt?: Date }>
  ): Promise<LessonProgress> {
    let progress = await this.progressRepository.findOne({
      where: { userId, lessonId }
    });

    if (!progress) {
      progress = this.progressRepository.create({
        userId,
        lessonId,
        status: LessonProgressStatus.LOCKED,
        progressPercentage: 0,
        timeSpent: 0,
        isSkipped: false,
        lastUpdated: new Date()
      });
    }

    // อัปเดตข้อมูล
    Object.assign(progress, updates, { lastUpdated: new Date() });

    return this.progressRepository.save(progress);
  }

  async getLessonProgress(userId: number, lessonId: number): Promise<LessonProgress | null> {
    return this.progressRepository.findOne({
      where: { userId, lessonId }
    });
  }

  async getLessonsProgress(userId: number, lessonIds: number[]): Promise<LessonProgress[]> {
    return this.progressRepository.find({
      where: {
        userId,
        lessonId: In(lessonIds)
      }
    });
  }

  async updateVideoProgress(
    userId: number, 
    lessonId: number, 
    currentTime: number, 
    duration: number
  ): Promise<LessonProgress> {
    const progressPercentage = Math.round((currentTime / duration) * 100);
    const timeSpent = Math.round(currentTime);

    return this.updateLessonProgress(userId, lessonId, {
      progressPercentage: Math.min(progressPercentage, 99), // ไม่ให้เกิน 99% จนกว่าจะจบจริง
      timeSpent,
      status: progressPercentage > 0 ? LessonProgressStatus.CURRENT : LessonProgressStatus.LOCKED
    });
  }

  async isLessonCompleted(userId: number, lessonId: number): Promise<boolean> {
    const progress = await this.getLessonProgress(userId, lessonId);
    return progress?.status === LessonProgressStatus.COMPLETED;
  }

  async getCompletedLessonsCount(userId: number, lessonIds: number[]): Promise<number> {
    return this.progressRepository.count({
      where: {
        userId,
        lessonId: In(lessonIds),
        status: LessonProgressStatus.COMPLETED
      }
    });
  }

  async resetLessonProgress(userId: number, lessonId: number): Promise<void> {
    await this.progressRepository.delete({ userId, lessonId });
  }
}
