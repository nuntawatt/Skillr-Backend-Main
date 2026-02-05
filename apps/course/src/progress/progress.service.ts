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

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(LessonProgress)
    private readonly lessonProgressRepository: Repository<LessonProgress>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
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
        progressPercent: 0,
      });
    }

    if (dto.positionSeconds !== undefined) {
      row.positionSeconds = dto.positionSeconds;
    }

    if (dto.durationSeconds !== undefined) {
      row.durationSeconds = dto.durationSeconds;
    }

    if (dto.checkpoint !== undefined) {
      row.checkpoint = dto.checkpoint;
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
      row.progressPercent = Math.max(0, Math.min(100, Number(nextPercent)));
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
    return this.toResponse(saved);
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
        resumeCheckpoint: null,
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
    const resumeCheckpoint = resumeLessonId
      ? progressRows.find((p) => p.lessonId === resumeLessonId)?.checkpoint ?? null
      : null;

    return {
      courseId,
      totalLessons,
      completedLessons,
      percent,
      resumeLessonId,
      resumeCheckpoint,
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
      progressPercent: Number(row.progressPercent),
      positionSeconds: row.positionSeconds ?? null,
      durationSeconds: row.durationSeconds ?? null,
      checkpoint: row.checkpoint ?? null,
      lastViewedAt: row.lastViewedAt ?? null,
      completedAt: row.completedAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
