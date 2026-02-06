import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Lesson } from '../lessons/entities/lesson.entity';
import { Chapter } from '../chapters/entities/chapter.entity';
import { UpsertLessonProgressDto } from './dto/upsert-lesson-progress.dto';
import { LessonProgress, LessonProgressStatus } from './entities/lesson-progress.entity';
import { LessonProgressResponseDto } from './dto/lesson-progress-response.dto';
import { ChapterProgressDto } from './dto/chapter-progress.dto';
import { ChapterRoadmapDto, ItemStatusDto } from './dto/chapter-roadmap.dto';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(LessonProgress)
    private readonly lessonProgressRepository: Repository<LessonProgress>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Chapter)
    private readonly chapterRepository: Repository<Chapter>,
  ) { }

  // Lesson Progress

  async getAllLessonProgress(userId: string): Promise<LessonProgressResponseDto[]> {
    const rows = await this.lessonProgressRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });

    return rows.map((r) => this.toResponse(r));
  }

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
    const lesson = await this.lessonRepository.findOne({
      where: { lesson_id: lessonId },
    });

    if (!lesson) {
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
        progressPercent: 0,
      });
    } else if (row.status === LessonProgressStatus.LOCKED) {
      throw new BadRequestException('Lesson is locked');
    }

    if (dto.positionSeconds !== undefined) {
      row.positionSeconds = dto.positionSeconds;
    }

    if (dto.durationSeconds !== undefined) {
      row.durationSeconds = dto.durationSeconds;
    }

    const inferredPercent =
      dto.progressPercent === undefined &&
        dto.positionSeconds !== undefined &&
        dto.durationSeconds !== undefined &&
        dto.durationSeconds > 0
        ? (dto.positionSeconds / dto.durationSeconds) * 100
        : undefined;

    const nextPercent = dto.progressPercent ?? inferredPercent;

    if (nextPercent !== undefined && !Number.isNaN(nextPercent)) {
      row.progressPercent = Math.max(
        0,
        Math.min(100, Number(nextPercent)),
      );
    }

    if (dto.status !== undefined) {
      row.status = dto.status;
    }

    row.lastViewedAt = new Date();

    if (dto.markCompleted) {
      row.status = LessonProgressStatus.COMPLETED;
      row.progressPercent = 100;
      row.completedAt = new Date();
    }

    const saved = await this.lessonProgressRepository.save(row);

    // Ensure the next lesson exists as LOCKED in DB (mapLessonId=completed/current lesson)
    const nextLesson = await this.lessonRepository.findOne({
      where: {
        chapter_id: lesson.chapter_id,
        orderIndex: lesson.orderIndex + 1,
      },
      order: { orderIndex: 'ASC' },
    });

    if (nextLesson) {
      let nextProgress = await this.lessonProgressRepository.findOne({
        where: { userId, lessonId: nextLesson.lesson_id },
      });

      if (!nextProgress) {
        nextProgress = this.lessonProgressRepository.create({
          userId,
          lessonId: nextLesson.lesson_id,
          status: LessonProgressStatus.LOCKED,
          progressPercent: 0,
          mapLessonId: lessonId,
        });
        await this.lessonProgressRepository.save(nextProgress);
      } else if (nextProgress.mapLessonId == null) {
        nextProgress.mapLessonId = lessonId;
        await this.lessonProgressRepository.save(nextProgress);
      }

      // If current lesson is finished, unlock the next lesson
      if (
        (saved.status === LessonProgressStatus.COMPLETED ||
          saved.status === LessonProgressStatus.SKIPPED) &&
        nextProgress.status === LessonProgressStatus.LOCKED
      ) {
        nextProgress.status = LessonProgressStatus.IN_PROGRESS;
        nextProgress.lastViewedAt = new Date();
        await this.lessonProgressRepository.save(nextProgress);
      }
    }

    return this.toResponse(saved);
  }

  async skipLessonAndUnlockNext(
    userId: string,
    lessonId: number,
  ): Promise<{ skipped: LessonProgressResponseDto; unlockedNext: LessonProgressResponseDto | null }> {
    const currentLesson = await this.lessonRepository.findOne({
      where: { lesson_id: lessonId },
    });

    if (!currentLesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    let currentProgress = await this.lessonProgressRepository.findOne({
      where: { userId, lessonId },
    });

    if (!currentProgress) {
      currentProgress = this.lessonProgressRepository.create({
        userId,
        lessonId,
        status: LessonProgressStatus.IN_PROGRESS,
        progressPercent: 0,
      });
    }

    currentProgress.status = LessonProgressStatus.SKIPPED;
    currentProgress.progressPercent = 100;
    currentProgress.lastViewedAt = new Date();
    currentProgress.completedAt = new Date();

    const savedCurrent = await this.lessonProgressRepository.save(currentProgress);

    const nextLesson = await this.lessonRepository.findOne({
      where: {
        chapter_id: currentLesson.chapter_id,
        orderIndex: currentLesson.orderIndex + 1,
      },
      order: { orderIndex: 'ASC' },
    });

    if (!nextLesson) {
      return { skipped: this.toResponse(savedCurrent), unlockedNext: null };
    }

    let nextProgress = await this.lessonProgressRepository.findOne({
      where: { userId, lessonId: nextLesson.lesson_id },
    });

    if (!nextProgress) {
      nextProgress = this.lessonProgressRepository.create({
        userId,
        lessonId: nextLesson.lesson_id,
        status: LessonProgressStatus.IN_PROGRESS,
        progressPercent: 0,
        mapLessonId: lessonId,
        lastViewedAt: new Date(),
      });
      nextProgress = await this.lessonProgressRepository.save(nextProgress);
    } else if (nextProgress.status === LessonProgressStatus.LOCKED) {
      nextProgress.status = LessonProgressStatus.IN_PROGRESS;
      nextProgress.lastViewedAt = new Date();
      if (nextProgress.mapLessonId == null) {
        nextProgress.mapLessonId = lessonId;
      }
      nextProgress = await this.lessonProgressRepository.save(nextProgress);
    }

    return {
      skipped: this.toResponse(savedCurrent),
      unlockedNext: this.toResponse(nextProgress),
    };
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

    const progressByLessonId = new Map(progressRows.map((p) => [p.lessonId, p] as const));

    const completedSet = new Set(
      progressRows
        .filter(p =>
          p.status === LessonProgressStatus.COMPLETED ||
          p.status === LessonProgressStatus.SKIPPED,
        )
        .map(p => p.lessonId),
    );

    const completedItems = completedSet.size;
    const totalItems = lessons.length;

    const percent =
      Math.round((completedItems / totalItems) * 10000) / 100;

    return {
      chapterId,
      totalItems,
      completedItems,
      percent,
      resumeLessonId: (() => {
        const inProgress = lessons.find(
          (l) => progressByLessonId.get(l.lesson_id)?.status === LessonProgressStatus.IN_PROGRESS,
        );
        if (inProgress) {
          return inProgress.lesson_id;
        }

        const firstNotDone = lessons.find((l) => !completedSet.has(l.lesson_id));
        if (!firstNotDone) {
          return null;
        }

        const status = progressByLessonId.get(firstNotDone.lesson_id)?.status;
        return status === LessonProgressStatus.LOCKED ? null : firstNotDone.lesson_id;
      })(),
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

    if (lessons.length === 0) {
      return {
        chapterId,
        chapterTitle: chapter.chapter_title,
        progressPercent: 0,
        items: [],
        nextAvailableLessonId: null,
      };
    }

    const lessonIds = lessons.map(l => l.lesson_id);

    const progressRows = await this.lessonProgressRepository.find({
      where: { userId, lessonId: In(lessonIds) },
    });

    // If no progress exists at all for this chapter, initialize first lesson as IN_PROGRESS
    // and ensure the next lesson is present as LOCKED in DB for mapping/visibility.
    if (progressRows.length === 0) {
      const firstLesson = lessons[0];

      await this.lessonProgressRepository.save(
        this.lessonProgressRepository.create({
          userId,
          lessonId: firstLesson.lesson_id,
          status: LessonProgressStatus.IN_PROGRESS,
          progressPercent: 0,
          lastViewedAt: new Date(),
        }),
      );

      const secondLesson = lessons[1];
      if (secondLesson) {
        await this.lessonProgressRepository.save(
          this.lessonProgressRepository.create({
            userId,
            lessonId: secondLesson.lesson_id,
            status: LessonProgressStatus.LOCKED,
            progressPercent: 0,
            mapLessonId: firstLesson.lesson_id,
          }),
        );
      }

      // Re-read after initialization
      const refreshed = await this.lessonProgressRepository.find({
        where: { userId, lessonId: In(lessonIds) },
      });
      progressRows.splice(0, progressRows.length, ...refreshed);
    }

    const completedSet = new Set(
      progressRows
        .filter(p =>
          p.status === LessonProgressStatus.COMPLETED ||
          p.status === LessonProgressStatus.SKIPPED,
        )
        .map(p => p.lessonId),
    );

    let nextAvailableLessonId: number | null = null;

    const items: ItemStatusDto[] = lessons.map(lesson => {
      const progress = progressRows.find(
        p => p.lessonId === lesson.lesson_id,
      );

      const status = progress?.status ?? LessonProgressStatus.LOCKED;
      if (nextAvailableLessonId == null && status === LessonProgressStatus.IN_PROGRESS) {
        nextAvailableLessonId = lesson.lesson_id;
      }

      return {
        lessonId: lesson.lesson_id,
        lessonTitle: lesson.lesson_title,
        lessonType: lesson.lesson_type,
        status,
        progressPercent:
          progress?.progressPercent ??
          (status === LessonProgressStatus.COMPLETED || status === LessonProgressStatus.SKIPPED ? 100 : 0),
        positionSeconds: progress?.positionSeconds ?? null,
        durationSeconds: progress?.durationSeconds ?? null,
        completedAt: progress?.completedAt ?? null,
        orderIndex: lesson.orderIndex,
      };
    });

    const completedItems = completedSet.size;
    const totalItems = lessons.length;

    const progressPercent =
      totalItems > 0
        ? Math.round((completedItems / totalItems) * 10000) / 100
        : 0;

    return {
      chapterId,
      chapterTitle: chapter.chapter_title,
      progressPercent,
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
      mapLessonId: row.mapLessonId ?? null,
      progressPercent: Number(row.progressPercent),
      checkpoint: row.checkpoint ?? null,
      positionSeconds: row.positionSeconds ?? null,
      durationSeconds: row.durationSeconds ?? null,
      lastViewedAt: row.lastViewedAt ?? null,
      completedAt: row.completedAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
