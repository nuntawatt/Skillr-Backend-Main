import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Lesson } from '../lessons/entities/lesson.entity';
import { Chapter } from '../chapters/entities/chapter.entity';
import { Level } from '../levels/entities/level.entity';
import { UpsertLessonProgressDto } from './dto/upsert-lesson-progress.dto';
import { LessonProgress, LessonProgressStatus } from './entities/lesson-progress.entity';
import { LessonProgressResponseDto } from './dto/lesson-progress-response.dto';
import { CourseProgressSummaryDto } from './dto/course-progress-summary.dto';
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

  async getLessonProgress(userId: string, lessonId: number): Promise<LessonProgressResponseDto | null> {
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
    const lessonExists = await this.lessonRepository.exist({ where: { lesson_id: lessonId } });
    if (!lessonExists) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    let row = await this.lessonProgressRepository.findOne({ where: { userId, lessonId } });
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
      row.progress_Percent = Math.max(0, Math.min(100, Number(nextPercent)));
    }

    if (dto.status !== undefined) {
      row.status = dto.status;
    }

    row.lastViewedAt = new Date();

    if (dto.markCompleted) {
      row.status = LessonProgressStatus.COMPLETED;
      row.progress_Percent = 100;
      row.completedAt = new Date();

      // Unlock next items when lesson is completed
      await this.unlockNextItems(userId, lessonId);
    }

    const saved = await this.lessonProgressRepository.save(row);
    return this.toResponse(saved);
  }

  async getChapterProgress(userId: string, chapterId: number): Promise<ChapterProgressDto> {
    const chapter = await this.chapterRepository.findOne({ where: { chapter_id: chapterId } });
    if (!chapter) {
      throw new NotFoundException(`Chapter with ID ${chapterId} not found`);
    }

    const lessons = await this.lessonRepository.find({
      where: { chapter_id: chapterId },
      order: { orderIndex: 'ASC' }
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
        .filter((p) => p.status === LessonProgressStatus.COMPLETED)
        .map((p) => p.lessonId),
    );

    const completedItems = completedSet.size;
    const totalItems = lessons.length;
    const percent = Math.round((completedItems / totalItems) * 10000) / 100;

    const resumeLesson = lessons.find(l => !completedSet.has(l.lesson_id));
    const resumeLessonId = resumeLesson?.lesson_id ?? null;

    return {
      chapterId,
      totalItems,
      completedItems,
      percent,
      resumeLessonId,
    };
  }

  async getChapterRoadmap(userId: string, chapterId: number): Promise<ChapterRoadmapDto> {
    const chapter = await this.chapterRepository.findOne({ where: { chapter_id: chapterId } });
    if (!chapter) {
      throw new NotFoundException(`Chapter with ID ${chapterId} not found`);
    }

    const lessons = await this.lessonRepository.find({
      where: { chapter_id: chapterId },
      order: { orderIndex: 'ASC' }
    });

    const lessonIds = lessons.map(l => l.lesson_id);
    const progressRows = await this.lessonProgressRepository.find({
      where: { userId, lessonId: In(lessonIds) },
    });

    const completedSet = new Set(
      progressRows
        .filter((p) => p.status === LessonProgressStatus.COMPLETED)
        .map((p) => p.lessonId),
    );

    const items: ItemStatusDto[] = [];
    let hasFoundCurrent = false;
    let nextAvailableLessonId: number | null = null;

    for (const lesson of lessons) {
      const progress = progressRows.find(p => p.lessonId === lesson.lesson_id);
      let status: LessonProgressStatus = LessonProgressStatus.IN_PROGRESS;

      if (completedSet.has(lesson.lesson_id)) {
        status = LessonProgressStatus.COMPLETED;
      } else if (!hasFoundCurrent) {
        status = LessonProgressStatus.IN_PROGRESS;
        hasFoundCurrent = true;
        if (!nextAvailableLessonId) {
          nextAvailableLessonId = lesson.lesson_id;
        }
      }

      items.push({
        lessonId: lesson.lesson_id,
        lessonTitle: lesson.lesson_title,
        lessonType: lesson.lesson_type,
        status,
        progress_Percent: progress?.progress_Percent ?? (status === LessonProgressStatus.COMPLETED ? 100 : 0),
        position_Seconds: progress?.position_Seconds ?? null,
        duration_Seconds: progress?.duration_Seconds ?? null,
        completedAt: progress?.completedAt ?? null,
        orderIndex: lesson.orderIndex,
      });
    }

    const completedItems = completedSet.size;
    const totalItems = lessons.length;
    const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 10000) / 100 : 0;

    // Check if chapter has checkpoints (simplified - assume last lesson is checkpoint)
    const hasCheckpoint = lessons.length > 0 && lessons[lessons.length - 1].lesson_type === 'quiz';
    const checkpointUnlocked = hasCheckpoint && completedSet.has(lessons[lessons.length - 1].lesson_id);

    return {
      chapterId,
      chapterTitle: chapter.chapter_title,
      progress_Percent,
      items,
      nextAvailableLessonId,
      hasCheckpoint,
      checkpointUnlocked,
    };
  }

  async unlockNextItems(userId: string, completedLessonId: number): Promise<void> {
    const completedLesson = await this.lessonRepository.findOne({
      where: { lesson_id: completedLessonId }
    });

    if (!completedLesson) {
      throw new NotFoundException(`Lesson with ID ${completedLessonId} not found`);
    }

    const nextLessons = await this.lessonRepository.find({
      where: {
        chapter_id: completedLesson.chapter_id,
        orderIndex: completedLesson.orderIndex + 1
      }
    });

    for (const nextLesson of nextLessons) {
      const existingProgress = await this.lessonProgressRepository.findOne({
        where: { userId, lessonId: nextLesson.lesson_id }
      });

      if (!existingProgress) {
        await this.lessonProgressRepository.save({
          userId,
          lessonId: nextLesson.lesson_id,
          status: LessonProgressStatus.IN_PROGRESS,
          progress_Percent: 0,
        });
      }
    }
  }

  async getCourseSummary(userId: string, courseId: number): Promise<CourseProgressSummaryDto> {
    const orderedLessonIds = await this.getOrderedLessonIdsForCourse(courseId);

    if (orderedLessonIds.length === 0) {
      return {
        courseId,
        totalLessons: 0,
        completedLessons: 0,
        percent: 0,
        resumeLessonId: null,
      };
    }

    const progressRows = await this.lessonProgressRepository.find({
      where: { userId, lessonId: In(orderedLessonIds) },
    });

    const completedSet = new Set(
      progressRows
        .filter((p) => p.status === LessonProgressStatus.COMPLETED)
        .map((p) => p.lessonId),
    );

    const completedLessons = completedSet.size;
    const totalLessons = orderedLessonIds.length;
    const percent = Math.round((completedLessons / totalLessons) * 10000) / 100;

    const resumeLessonId = orderedLessonIds.find((id) => !completedSet.has(id)) ?? null;

    return {
      courseId,
      totalLessons,
      completedLessons,
      percent,
      resumeLessonId,
    };
  }

  private async getOrderedLessonIdsForCourse(courseId: number): Promise<number[]> {
    const rows = await this.lessonRepository
      .createQueryBuilder('lesson')
      .innerJoin(Chapter, 'chapter', 'chapter.chapter_id = lesson.chapter_id')
      .innerJoin(Level, 'level', 'level.level_id = chapter.level_id')
      .where('level.course_id = :courseId', { courseId })
      .select('lesson.lesson_id', 'lessonId')
      .addSelect('level.level_orderIndex', 'levelOrder')
      .addSelect('chapter.chapter_orderIndex', 'chapterOrder')
      .addSelect('lesson.orderIndex', 'lessonOrder')
      .orderBy('level.level_orderIndex', 'ASC')
      .addOrderBy('chapter.chapter_orderIndex', 'ASC')
      .addOrderBy('lesson.orderIndex', 'ASC')
      .getRawMany<{ lessonId: number }>();

    return rows.map((r) => Number(r.lessonId)).filter((n) => Number.isFinite(n));
  }

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
