import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Lesson } from '../lessons/entities/lesson.entity';
import { Chapter } from '../chapters/entities/chapter.entity';
import { UpsertLessonProgressDto } from './dto/upsert-lesson-progress.dto';
import { LessonProgress, LessonProgressStatus } from './entities/lesson-progress.entity';
import { LessonProgressResponseDto } from './dto/lesson-progress-response.dto';
import { ChapterProgressDto } from './dto/chapter-progress.dto';
import { ChapterRoadmapDto, ItemStatusDto } from './dto/chapter-roadmap.dto';
import { StreakService } from '../streak/streak.service';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(LessonProgress)
    private readonly lessonProgressRepository: Repository<LessonProgress>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Chapter)
    private readonly chapterRepository: Repository<Chapter>,
    @Inject(() => StreakService)
    private readonly streakService: StreakService,
  ) { }

  // Lesson Progress

  async getLessonProgress(
    userId: string,
    lessonId: number,
  ): Promise<LessonProgressResponseDto | null> {
    const row = await this.lessonProgressRepository.findOne({
      where: { userId, lessonId },
    });

    return row ? this.toResponse(row) : null;
  }

  async upsertLessonProgress(
    userId: string,
    lessonId: number,
    dto: UpsertLessonProgressDto,
  ): Promise<LessonProgressResponseDto> {
    const lessonExists = await this.lessonRepository.exist({
      where: { lesson_id: lessonId },
    });

    if (!lessonExists) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    let row = await this.lessonProgressRepository.findOne({
      where: { userId, lessonId },
    });

    if (!row) {
      row = this.lessonProgressRepository.create({
        userId,
        lessonId,
        status: LessonProgressStatus.IN_PROGRESS,
        progress_Percent: 0,
      });
    }

    if (dto.position_Seconds !== undefined) {
      row.position_Seconds = dto.position_Seconds;
    }

    if (dto.duration_Seconds !== undefined) {
      row.duration_Seconds = dto.duration_Seconds;
    }

    const inferredPercent =
      dto.progress_Percent === undefined &&
        dto.position_Seconds !== undefined &&
        dto.duration_Seconds !== undefined &&
        dto.duration_Seconds > 0
        ? (dto.position_Seconds / dto.duration_Seconds) * 100
        : undefined;

    const nextPercent = dto.progress_Percent ?? inferredPercent;

    if (nextPercent !== undefined && !Number.isNaN(nextPercent)) {
      row.progress_Percent = Math.max(
        0,
        Math.min(100, Number(nextPercent)),
      );
    }

    if (dto.status !== undefined) {
      const wasAlreadyCompleted = row.status === LessonProgressStatus.COMPLETED;
      row.status = dto.status;
      
      // Update streak when status changes to COMPLETED
      if (dto.status === LessonProgressStatus.COMPLETED && !wasAlreadyCompleted) {
        row.completedAt = new Date();
        await this.streakService.updateStreakOnActivity(userId);
      }
    }

    row.lastViewedAt = new Date();

    if (dto.markCompleted) {
      const wasAlreadyCompleted = row.status === LessonProgressStatus.COMPLETED;
      row.status = LessonProgressStatus.COMPLETED;
      row.progress_Percent = 100;
      row.completedAt = new Date();
      
      // Update streak only when item is newly completed
      if (!wasAlreadyCompleted) {
        await this.streakService.updateStreakOnActivity(userId);
      }
    }

    const saved = await this.lessonProgressRepository.save(row);
    return this.toResponse(saved);
  }

  // Chapter Progress

  async getChapterProgress(
    userId: string,
    chapterId: number,
  ): Promise<ChapterProgressDto> {
    const chapter = await this.chapterRepository.findOne({
      where: { chapter_id: chapterId },
    });

    if (!chapter) {
      throw new NotFoundException(`Chapter with ID ${chapterId} not found`);
    }

    const lessons = await this.lessonRepository.find({
      where: { chapter_id: chapterId },
      order: { orderIndex: 'ASC' },
    });

    if (lessons.length === 0) {
      return {
        chapterId,
        totalItems: 0,
        completedItems: 0,
        percent: 0,
        resumeLessonId: null,
      };
    }

    const lessonIds = lessons.map(l => l.lesson_id);

    const progressRows = await this.lessonProgressRepository.find({
      where: { userId, lessonId: In(lessonIds) },
    });

    const completedSet = new Set(
      progressRows
        .filter(p => p.status === LessonProgressStatus.COMPLETED)
        .map(p => p.lessonId),
    );

    const completedItems = completedSet.size;
    const totalItems = lessons.length;

    const percent =
      Math.round((completedItems / totalItems) * 10000) / 100;

    const resumeLesson = lessons.find(
      l => !completedSet.has(l.lesson_id),
    );

    return {
      chapterId,
      totalItems,
      completedItems,
      percent,
      resumeLessonId: resumeLesson?.lesson_id ?? null,
    };
  }

  // Chapter Roadmap

  async getChapterRoadmap(
    userId: string,
    chapterId: number,
  ): Promise<ChapterRoadmapDto> {
    const chapter = await this.chapterRepository.findOne({
      where: { chapter_id: chapterId },
    });

    if (!chapter) {
      throw new NotFoundException(`Chapter with ID ${chapterId} not found`);
    }

    const lessons = await this.lessonRepository.find({
      where: { chapter_id: chapterId },
      order: { orderIndex: 'ASC' },
    });

    const lessonIds = lessons.map(l => l.lesson_id);

    const progressRows = await this.lessonProgressRepository.find({
      where: { userId, lessonId: In(lessonIds) },
    });

    const completedSet = new Set(
      progressRows
        .filter(p => p.status === LessonProgressStatus.COMPLETED)
        .map(p => p.lessonId),
    );

    let hasFoundCurrent = false;
    let nextAvailableLessonId: number | null = null;

    const items: ItemStatusDto[] = lessons.map(lesson => {
      const progress = progressRows.find(
        p => p.lessonId === lesson.lesson_id,
      );

      const isCompleted = completedSet.has(lesson.lesson_id);
      let isCurrent = false;
      let status = LessonProgressStatus.IN_PROGRESS;

      if (isCompleted) {
        status = LessonProgressStatus.COMPLETED;
      } else if (!hasFoundCurrent) {
        isCurrent = true;
        hasFoundCurrent = true;
        nextAvailableLessonId = lesson.lesson_id;
      }

      return {
        lessonId: lesson.lesson_id,
        lessonTitle: lesson.lesson_title,
        lessonType: lesson.lesson_type,
        status,
        isCurrent,
        progress_Percent:
          progress?.progress_Percent ??
          (status === LessonProgressStatus.COMPLETED ? 100 : 0),
        position_Seconds: progress?.position_Seconds ?? null,
        duration_Seconds: progress?.duration_Seconds ?? null,
        completedAt: progress?.completedAt ?? null,
        orderIndex: lesson.orderIndex,
      };
    });

    const completedItems = completedSet.size;
    const totalItems = lessons.length;

    const progress_Percent =
      totalItems > 0
        ? Math.round((completedItems / totalItems) * 10000) / 100
        : 0;

    return {
      chapterId,
      chapterTitle: chapter.chapter_title,
      progress_Percent,
      nextAvailableLessonId,
      items,
    };
  }

  // Mapping
  private toResponse(row: LessonProgress): LessonProgressResponseDto {
    return {
      lessonId: row.lessonId,
      userId: row.userId,
      status: row.status,
      progress_Percent: Number(row.progress_Percent),
      position_Seconds: row.position_Seconds ?? null,
      duration_Seconds: row.duration_Seconds ?? null,
      lastViewedAt: row.lastViewedAt ?? null,
      completedAt: row.completedAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
