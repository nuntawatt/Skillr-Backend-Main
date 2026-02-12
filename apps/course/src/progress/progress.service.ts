import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, MoreThan, Repository } from 'typeorm';

import { Lesson } from '../lessons/entities/lesson.entity';
import { Chapter } from '../chapters/entities/chapter.entity';
import { UpsertLessonProgressDto } from './dto/upsert-lesson-progress.dto';
import { LessonProgress, LessonProgressStatus } from './entities/progress.entity';
import { LessonProgressResponseDto } from './dto/lesson-progress-response.dto';
import { ChapterProgressDto } from './dto/chapter-progress.dto';
import { ChapterRoadmapDto, ItemStatusDto } from './dto/chapter-roadmap.dto';
import { StreakService } from '../streaks/streak.service';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(LessonProgress)
    private readonly lessonProgressRepository: Repository<LessonProgress>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Chapter)
    private readonly chapterRepository: Repository<Chapter>,
    private readonly streakService: StreakService,
  ) { }

  // Lesson Progress
  async getAllLessonProgress(
    userId: string,
  ): Promise<LessonProgressResponseDto[]> {
    // เรียกดูแถวทั้งหมดของ lesson_progress สำหรับผู้ใช้ปัจจุบัน
    const rows = await this.lessonProgressRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });

    // ถ้าไม่มีแถวใดเลย ให้คืนค่า Array [null]
    if (rows.length === 0) {
      return [];
    }

    // ดึงบทเรียนที่เกี่ยวข้องกับแถว progress
    const lessonIds = Array.from(new Set(rows.map((r) => r.lessonId)));
    const lessons = await this.lessonRepository.find({
      where: { lesson_id: In(lessonIds) },
    });

    // create map lessonId -> lesson
    const lessonById = new Map(lessons.map((l) => [l.lesson_id, l] as const));

    // ดึงบทที่เกี่ยวข้องกับบทเรียนเหล่านั้น
    const chapterIds = Array.from(new Set(lessons.map((l) => l.chapter_id)));
    const chapters = chapterIds.length ? await this.chapterRepository.find({
      where: { chapter_id: In(chapterIds) },
    })
      : [];
    const levelIdByChapterId = new Map(
      chapters.map((c) => [c.chapter_id, c.levelId] as const),
    );

    // Map progress to DTO พร้อมข้อมูลบทเรียนและบทที่เกี่ยวข้อง
    return rows.map((r) => {
      const lesson = lessonById.get(r.lessonId);
      const chapterId = lesson?.chapter_id ?? null;
      const levelId = chapterId != null ? (levelIdByChapterId.get(chapterId) ?? null) : null;
      return this.toResponse(r, { chapterId, levelId });
    });
  }

  // Get lesson progress by lesson ID
  async getLessonProgress(
    userId: string,
    lessonId: number,
  ): Promise<LessonProgressResponseDto | null> {
    // ตรวจสอบว่ามีบทเรียน (lesson) อยู่จริงก่อน
    const lesson = await this.lessonRepository.findOne({
      where: { lesson_id: lessonId },
    });

    // ถ้าไม่พบบทเรียน ให้โยน 404 (Lesson not found)
    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    // ดึงแถว progress สำหรับบทเรียนและผู้ใช้ที่ระบุ
    const row = await this.lessonProgressRepository.findOne({
      where: { userId, lessonId },
    });

    // ถ้าไม่มีแถว progress ให้คืน 404
    if (!row) {
      throw new NotFoundException(`Progress for lesson ${lessonId} not found`);
    }

    // ดึงบทที่เกี่ยวข้อง
    const chapterId = lesson?.chapter_id ?? null;
    const chapter = chapterId != null ? await this.chapterRepository.findOne({
      where: { chapter_id: chapterId },
    })
      : null;

    const levelId = chapter?.levelId ?? null;

    return this.toResponse(row, { chapterId, levelId });
  }

  // Upsert lesson progress
  async upsertLessonProgress(
    userId: string,
    lessonId: number,
    dto: UpsertLessonProgressDto,
  ): Promise<LessonProgressResponseDto> {
    // ดึงบทเรียนที่ระบุ
    const lesson = await this.lessonRepository.findOne({
      where: { lesson_id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    // ดึงหรือสร้างแถว progress ใหม่
    let row = await this.lessonProgressRepository.findOne({
      where: { userId, lessonId },
    });

    // ถ้าไม่มีแถว ให้สร้างใหม่
    if (!row) {
      row = this.lessonProgressRepository.create({
        userId,
        lessonId,
        status: LessonProgressStatus.IN_PROGRESS,
        progressPercent: 0,
      });
    }

    // ถ้าแถวนี้ถูกทำเครื่องหมายว่า COMPLETED แล้ว ห้ามเปลี่ยนสถานะให้เป็นอย่างอื่น
    if (row && row.status === LessonProgressStatus.COMPLETED) {
      if (dto.status !== undefined && dto.status !== LessonProgressStatus.COMPLETED) {
        throw new BadRequestException('Cannot change status of a completed lesson');
      }
    }

    const previousStatus = row.status;

    // อัปเดตตำแหน่งวิดีโอถ้ามี
    if (dto.positionSeconds !== undefined) {
      row.positionSeconds = dto.positionSeconds;
    }

    // อัปเดตระยะเวลาวิดีโอถ้ามี
    if (dto.durationSeconds !== undefined) {
      row.durationSeconds = dto.durationSeconds;
    }

    // คำนวณเปอร์เซ็นต์ความคืบหน้าที่สันนิษฐาน
    const inferredPercent =
      dto.progressPercent === undefined &&
        dto.positionSeconds !== undefined &&
        dto.durationSeconds !== undefined &&
        dto.durationSeconds > 0
        ? (dto.positionSeconds / dto.durationSeconds) * 100
        : undefined;

    // อัปเดตเปอร์เซ็นต์ความคืบหน้า
    const nextPercent = dto.progressPercent ?? inferredPercent;

    // ตรวจสอบให้แน่ใจว่าเปอร์เซ็นต์อยู่ในช่วง 0-100
    if (nextPercent !== undefined && !Number.isNaN(nextPercent)) {
      const clamped = Math.max(0, Math.min(100, Number(nextPercent)));
      // เก็บค่าเป็นจำนวนเต็ม (ปัดให้เป็น integer)
      row.progressPercent = Math.round(clamped);
    }

    // อัปเดตสถานะถ้ามี
    if (dto.status !== undefined) {
      row.status = dto.status;
    }

    // อัปเดตเวลาที่ดูล่าสุด
    row.lastViewedAt = new Date();

    // ถ้าทำเครื่องหมายว่าเสร็จสิ้น
    if (dto.markCompleted) {
      row.status = LessonProgressStatus.COMPLETED;
      row.progressPercent = 100;
      row.completedAt = new Date();
    }

    const saved = await this.lessonProgressRepository.save(row);

    // Bump streak only on first transition to COMPLETED or SKIPPED
    const wasCompleted = previousStatus === LessonProgressStatus.COMPLETED || previousStatus === LessonProgressStatus.SKIPPED;
    const nowCompleted = saved.status === LessonProgressStatus.COMPLETED || saved.status === LessonProgressStatus.SKIPPED;
    if (!wasCompleted && nowCompleted) {
      await this.streakService.bumpStreak(userId, saved.completedAt ?? new Date());
    }

    // ตรวจสอบบทเรียนถัดไปในบทเดียวกัน
    const nextLesson = await this.lessonRepository.findOne({
      where: {
        chapter_id: lesson.chapter_id,
        orderIndex: lesson.orderIndex + 1,
      },
      order: { orderIndex: 'ASC' },
    });

    // จัดการบทเรียนถัดไป
    if (nextLesson) {
      let nextProgress = await this.lessonProgressRepository.findOne({
        where: { userId, lessonId: nextLesson.lesson_id },
      });

      // ถ้าไม่มีแถว progress สำหรับบทเรียนถัดไป ให้สร้างเป็น LOCKED
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

      // ถ้าบทเรียนปัจจุบันเสร็จสิ้น ให้ปลดล็อกบทเรียนถัดไป
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

    // หากไม่มีบทเรียนถัดไปในบทเดียวกัน ให้พยายามปลดล็อกบทถัดไปของบทถัดไป (next chapter)
    if (!nextLesson) {
      // ตรวจสอบว่า chapter ปัจจุบันเสร็จสมบูรณ์สำหรับผู้ใช้หรือไม่
      const chapterCompleted = await this.isChapterCompletedForUser(userId, lesson.chapter_id);
      if (chapterCompleted) {
        // หา chapter ถัดไปในระดับเดียวกัน (ทนต่อช่องว่างของ chapter_orderIndex)
        const currentChapter = await this.chapterRepository.findOne({ where: { chapter_id: lesson.chapter_id } });
        if (currentChapter) {
          const nextChapter = await this.chapterRepository.findOne({
            where: {
              levelId: currentChapter.levelId,
              chapter_orderIndex: MoreThan(currentChapter.chapter_orderIndex ?? 0),
            },
            order: { chapter_orderIndex: 'ASC' },
          });

          if (nextChapter) {
            // ดึงบทเรียนตัวแรกของบทถัดไป
            const firstLessonNextChapter = await this.lessonRepository.findOne({
              where: { chapter_id: nextChapter.chapter_id },
              order: { orderIndex: 'ASC' },
            });

            if (firstLessonNextChapter) {
              let nextChapterProgress = await this.lessonProgressRepository.findOne({
                where: { userId, lessonId: firstLessonNextChapter.lesson_id },
              });

              if (!nextChapterProgress) {
                nextChapterProgress = this.lessonProgressRepository.create({
                  userId,
                  lessonId: firstLessonNextChapter.lesson_id,
                  status: LessonProgressStatus.IN_PROGRESS,
                  progressPercent: 0,
                  mapLessonId: lesson.lesson_id,
                  lastViewedAt: new Date(),
                });
                await this.lessonProgressRepository.save(nextChapterProgress);
              } else if (nextChapterProgress.status === LessonProgressStatus.LOCKED) {
                nextChapterProgress.status = LessonProgressStatus.IN_PROGRESS;
                nextChapterProgress.mapLessonId = nextChapterProgress.mapLessonId ?? lesson.lesson_id;
                nextChapterProgress.lastViewedAt = new Date();
                await this.lessonProgressRepository.save(nextChapterProgress);
              }
            }
          }
        }
      }
    }
    // ดึงบทที่เกี่ยวข้อง
    const chapter = await this.chapterRepository.findOne({
      where: { chapter_id: lesson.chapter_id },
    });

    // ส่งกลับข้อมูลความคืบหน้า
    return this.toResponse(saved, {
      chapterId: lesson.chapter_id,
      levelId: chapter?.levelId ?? null,
    });
  }

  // Skip lesson and unlock next
  async skipLessonAndUnlockNext(
    userId: string,
    lessonId: number,
  ): Promise<{
    skipped: LessonProgressResponseDto;
    unlockedNext: LessonProgressResponseDto | null;
  }> {
    // ดึงบทเรียนปัจจุบัน
    const currentLesson = await this.lessonRepository.findOne({
      where: { lesson_id: lessonId },
    });

    if (!currentLesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    // ดึงหรือสร้างแถว progress สำหรับบทเรียนปัจจุบัน
    let currentProgress = await this.lessonProgressRepository.findOne({
      where: { userId, lessonId },
    });

    // ห้ามข้าม (skip) ถ้าบทเรียนถูกทำเครื่องหมายว่าเสร็จสมบูรณ์แล้ว
    if (currentProgress && currentProgress.status === LessonProgressStatus.COMPLETED) {
      throw new BadRequestException('Cannot skip a completed lesson');
    }

    // ถ้าไม่มีแถว ให้สร้างใหม่
    if (!currentProgress) {
      currentProgress = this.lessonProgressRepository.create({
        userId,
        lessonId,
        status: LessonProgressStatus.IN_PROGRESS,
        progressPercent: 0,
      });
    }

    const previousStatus = currentProgress.status;

    // อัปเดตสถานะเป็น SKIPPED
    currentProgress.status = LessonProgressStatus.SKIPPED;
    currentProgress.progressPercent = 100;
    currentProgress.lastViewedAt = new Date();
    currentProgress.completedAt = new Date();

    // บันทึกแถวปัจจุบัน
    const savedCurrent = await this.lessonProgressRepository.save(currentProgress);

    // Bump streak on first-time skip completion
    const wasCompleted = previousStatus === LessonProgressStatus.COMPLETED || previousStatus === LessonProgressStatus.SKIPPED;
    if (!wasCompleted) {
      await this.streakService.bumpStreak(userId, savedCurrent.completedAt ?? new Date());
    }

    // ดึงบทที่เกี่ยวข้อง
    const currentChapter = await this.chapterRepository.findOne({
      where: { chapter_id: currentLesson.chapter_id },
    });
    const currentLevelId = currentChapter?.levelId ?? null;

    // ตรวจสอบบทเรียนถัดไปในบทเดียวกัน
    const nextLesson = await this.lessonRepository.findOne({
      where: {
        chapter_id: currentLesson.chapter_id,
        orderIndex: currentLesson.orderIndex + 1,
      },
      order: { orderIndex: 'ASC' },
    });

    // ถ้าไม่มีบทเรียนถัดไปในบทเดียวกัน ให้พยายามปลดล็อกบทแรกของ chapter ถัดไป
    if (!nextLesson) {
      let unlockedNextProgress: LessonProgress | null = null;
      let unlockedChapterId: number | null = null;
      let unlockedLevelId: number | null = null;

      // ตรวจสอบว่า chapter ปัจจุบันถูกทำครบจริงก่อน (ถ้ายังไม่ครบ ห้ามปลดล็อก chapter ถัดไป)
      const chapterCompleted = await this.isChapterCompletedForUser(userId, currentLesson.chapter_id);
      if (!chapterCompleted) {
        return {
          skipped: this.toResponse(savedCurrent, {
            chapterId: currentLesson.chapter_id,
            levelId: currentLevelId,
          }),
          unlockedNext: null,
        };
      }

      if (currentChapter) {
        const nextChapter = await this.chapterRepository.findOne({
          where: {
            levelId: currentChapter.levelId,
            chapter_orderIndex: MoreThan(currentChapter.chapter_orderIndex ?? 0),
          },
          order: { chapter_orderIndex: 'ASC' },
        });

        if (nextChapter) {
          const firstLessonNextChapter = await this.lessonRepository.findOne({
            where: { chapter_id: nextChapter.chapter_id },
            order: { orderIndex: 'ASC' },
          });

          if (firstLessonNextChapter) {
            let nextChapterProgress = await this.lessonProgressRepository.findOne({
              where: { userId, lessonId: firstLessonNextChapter.lesson_id },
            });

            if (!nextChapterProgress) {
              nextChapterProgress = this.lessonProgressRepository.create({
                userId,
                lessonId: firstLessonNextChapter.lesson_id,
                status: LessonProgressStatus.IN_PROGRESS,
                progressPercent: 0,
                mapLessonId: lessonId,
                lastViewedAt: new Date(),
              });
              nextChapterProgress = await this.lessonProgressRepository.save(nextChapterProgress);
            } else if (nextChapterProgress.status === LessonProgressStatus.LOCKED) {
              nextChapterProgress.status = LessonProgressStatus.IN_PROGRESS;
              nextChapterProgress.mapLessonId = nextChapterProgress.mapLessonId ?? lessonId;
              nextChapterProgress.lastViewedAt = new Date();
              nextChapterProgress = await this.lessonProgressRepository.save(nextChapterProgress);
            }

            if (nextChapterProgress) {
              unlockedNextProgress = nextChapterProgress;
              unlockedChapterId = firstLessonNextChapter.chapter_id;
              unlockedLevelId = nextChapter.levelId ?? null;
            }
          }
        }
      }

      return {
        skipped: this.toResponse(savedCurrent, {
          chapterId: currentLesson.chapter_id,
          levelId: currentLevelId,
        }),
        unlockedNext: unlockedNextProgress
          ? this.toResponse(unlockedNextProgress, {
              chapterId: unlockedChapterId,
              levelId: unlockedLevelId,
            })
          : null,
      };
    }

    // จัดการบทเรียนถัดไป
    let nextProgress = await this.lessonProgressRepository.findOne({
      where: { userId, lessonId: nextLesson.lesson_id },
    });

    // ถ้าไม่มีแถว progress สำหรับบทเรียนถัดไป ให้สร้างเป็น IN_PROGRESS
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
    }
    // ถ้าเป็น LOCKED ให้เปลี่ยนเป็น IN_PROGRESS
    else if (nextProgress.status === LessonProgressStatus.LOCKED) {
      nextProgress.status = LessonProgressStatus.IN_PROGRESS;
      nextProgress.lastViewedAt = new Date();
      // ตั้งค่า mapLessonId ถ้ายังไม่มี
      if (nextProgress.mapLessonId == null) {
        nextProgress.mapLessonId = lessonId;
      }
      nextProgress = await this.lessonProgressRepository.save(nextProgress);
    }

    // ดึงบทที่เกี่ยวข้องกับบทเรียนถัดไป
    const nextChapter = nextLesson.chapter_id === currentLesson.chapter_id
      ? currentChapter
      : await this.chapterRepository.findOne({
        where: { chapter_id: nextLesson.chapter_id },
      });
    const nextLevelId = nextChapter?.levelId ?? null;

    // ส่งกลับข้อมูลความคืบหน้า
    return {
      skipped: this.toResponse(savedCurrent, {
        chapterId: currentLesson.chapter_id,
        levelId: currentLevelId,
      }),
      unlockedNext: this.toResponse(nextProgress, {
        chapterId: nextLesson.chapter_id,
        levelId: nextLevelId,
      }),
    };
  }

  // Chapter Progress
  async getChapterProgress(
    userId: string,
    chapterId: number,
  ): Promise<ChapterProgressDto> {
    // ดึงบทที่ระบุ
    const chapter = await this.chapterRepository.findOne({
      where: { chapter_id: chapterId },
    });

    if (!chapter) {
      throw new NotFoundException(`Chapter with ID ${chapterId} not found`);
    }

    // ดึงบทเรียนทั้งหมดในบทนั้น
    const lessons = await this.lessonRepository.find({
      where: { chapter_id: chapterId },
      order: { orderIndex: 'ASC' },
    });

    // ถ้าไม่มีบทเรียนเลย ให้คืนค่า progress เป็น 0%
    if (lessons.length === 0) {
      return {
        chapterId,
        totalItems: 0,
        completedItems: 0,
        percent: 0,
        resumeLessonId: null,
      };
    }

    // ดึง IDs ของบทเรียน
    const lessonIds = lessons.map((l) => l.lesson_id);

    // function ตรวจสอบว่าบทนี้ถูกปลดล็อกสำหรับผู้ใช้หรือไม่
    const isUnlocked = await this.isChapterUnlockedForUser(
      userId,
      chapter,
      lessonIds,
    );

    // ถ้าไม่ถูกปลดล็อก ให้คืนค่า progress เป็น 0%
    if (!isUnlocked) {
      return {
        chapterId,
        totalItems: lessons.length,
        completedItems: 0,
        percent: 0,
        resumeLessonId: null,
      };
    }

    // ดึงแถว progress สำหรับบทเรียนเหล่านั้น
    const progressRows = await this.lessonProgressRepository.find({
      where: { userId, lessonId: In(lessonIds) },
    });

    // สร้างแผนที่ lessonId -> progress
    const progressByLessonId = new Map(
      progressRows.map((p) => [p.lessonId, p] as const),
    );

    // calculate progress summary for the chapter
    const completedSet = new Set(
      progressRows
        .filter(
          (p) =>
            p.status === LessonProgressStatus.COMPLETED ||
            p.status === LessonProgressStatus.SKIPPED)
        .map((p) => p.lessonId)
    );

    const completedItems = completedSet.size;

    const totalItems = lessons.length;

    // คำนวณเปอร์เซ็นต์ความคืบหน้า
    // นับเฉพาะบทที่มีสถานะ COMPLETED หรือ SKIPPED (ยกเว้น IN_PROGRESS และ LOCKED)
    let sumPercent = 0;
    let includedCount = 0;

    for (const lesson of lessons) {
      const progress = progressByLessonId.get(lesson.lesson_id);
      const status = progress?.status ?? LessonProgressStatus.LOCKED;

      if (
        status !== LessonProgressStatus.COMPLETED &&
        status !== LessonProgressStatus.SKIPPED
      ) {
        continue;
      }

      // COMPLETED/SKIPPED = 100
      sumPercent += 100;
      includedCount += 1;
    }

    // คืนค่าเปอร์เซ็นต์เฉลี่ยเป็นจำนวนเต็ม (ถ้าไม่มีรายการที่นับ ให้เป็น 0)
    const percent = includedCount > 0 ? Math.round(sumPercent / includedCount) : 0;

    // ค้นหาบทเรียนถัดไปที่ควรดำเนินการต่อ
    return {
      chapterId,
      totalItems,
      completedItems,
      percent,
      resumeLessonId: (() => {
        const inProgress = lessons.find(
          (l) =>
            progressByLessonId.get(l.lesson_id)?.status ===
            LessonProgressStatus.IN_PROGRESS,
        );

        // ถ้ามีบทเรียนที่กำลังดำเนินการอยู่ ให้คืนค่า ID ของบทเรียนนั้น
        if (inProgress) {
          return inProgress.lesson_id;
        }

        // ถ้าไม่มี ให้ค้นหาบทเรียนแรกที่ยังไม่เสร็จสิ้น
        const firstNotDone = lessons.find(
          (l) => !completedSet.has(l.lesson_id),
        );

        if (!firstNotDone) {
          return null;
        }

        // ตรวจสอบสถานะของบทเรียนนั้น
        const status = progressByLessonId.get(firstNotDone.lesson_id)?.status;
        return status === LessonProgressStatus.LOCKED
          ? null
          : firstNotDone.lesson_id;
      })(),
    };
  }

  // Chapter Roadmap
  async getChapterRoadmap(
    userId: string,
    chapterId: number,
  ): Promise<ChapterRoadmapDto> {
    // ดึงบทที่ระบุ
    const chapter = await this.chapterRepository.findOne({
      where: { chapter_id: chapterId },
    });

    if (!chapter) {
      throw new NotFoundException(`Chapter with ID ${chapterId} not found`);
    }

    // ดึงบทเรียนทั้งหมดในบทนั้น
    const lessons = await this.lessonRepository.find({
      where: { chapter_id: chapterId },
      order: { orderIndex: 'ASC' },
    });

    // ถ้าไม่มีบทเรียนเลย ให้คืนค่า roadmap ว่าง
    if (lessons.length === 0) {
      return {
        chapterId,
        chapterTitle: chapter.chapter_title,
        progressPercent: 0,
        items: [],
        nextAvailableLessonId: null,
      };
    }

    // ดึง IDs ของบทเรียน
    const lessonIds = lessons.map((l) => l.lesson_id);

    // ตรวจสอบว่าบทนี้ถูกปลดล็อกสำหรับผู้ใช้หรือไม่
    const isUnlocked = await this.isChapterUnlockedForUser(
      userId,
      chapter,
      lessonIds,
    );
    // ถ้าไม่ถูกปลดล็อก ให้คืนค่า roadmap ที่มีสถานะ LOCKED ทั้งหมด
    if (!isUnlocked) {
      const items: ItemStatusDto[] = lessons.map((lesson) => ({
        lessonId: lesson.lesson_id,
        lessonTitle: lesson.lesson_title,
        lessonType: lesson.lesson_type,
        status: LessonProgressStatus.LOCKED,
        progressPercent: 0,
        positionSeconds: null,
        durationSeconds: null,
        completedAt: null,
        orderIndex: lesson.orderIndex,
      }));

      // คืนค่า roadmap ทั้งหมดเป็น LOCKED
      return {
        chapterId,
        chapterTitle: chapter.chapter_title,
        progressPercent: 0,
        nextAvailableLessonId: null,
        items,
      };
    }

    // ดึงแถว progress สำหรับบทเรียนเหล่านั้น
    const progressRows = await this.lessonProgressRepository.find({
      where: { userId, lessonId: In(lessonIds) },
    });

    // ถ้าไม่มีแถว progress เลย ให้สร้างแถวเริ่มต้นสำหรับบทเรียนแรก
    if (progressRows.length === 0) {
      const firstLesson = lessons[0];

      // สร้างแถว progress สำหรับบทเรียนแรกเป็น IN_PROGRESS
      await this.lessonProgressRepository.save(
        this.lessonProgressRepository.create({
          userId,
          lessonId: firstLesson.lesson_id,
          status: LessonProgressStatus.IN_PROGRESS,
          progressPercent: 0,
          lastViewedAt: new Date(),
        }),
      );

      // สร้างแถว progress สำหรับบทเรียนที่สองเป็น LOCKED (ถ้ามี)
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

      // อ่านข้อมูลใหม่หลังจากการเริ่มต้น
      const refreshed = await this.lessonProgressRepository.find({
        where: { userId, lessonId: In(lessonIds) },
      });
      progressRows.splice(0, progressRows.length, ...refreshed);
    }

    // สร้างสถานะบทเรียนสำหรับ roadmap
    let nextAvailableLessonId: number | null = null;

    const items: ItemStatusDto[] = lessons.map((lesson) => {
      const progress = progressRows.find(
        (p) => p.lessonId === lesson.lesson_id,
      );

      // กำหนดสถานะบทเรียน ถัดไปที่สามารถเข้าถึงได้
      const status = progress?.status ?? LessonProgressStatus.LOCKED;
      // 
      if (
        nextAvailableLessonId == null &&
        status === LessonProgressStatus.IN_PROGRESS
      ) {
        nextAvailableLessonId = lesson.lesson_id;
      }

      return {
        lessonId: lesson.lesson_id,
        lessonTitle: lesson.lesson_title,
        lessonType: lesson.lesson_type,
        status,
        progressPercent:
          progress?.progressPercent != null
            ? Math.round(Number(progress.progressPercent))
            : (status === LessonProgressStatus.COMPLETED ||
              status === LessonProgressStatus.SKIPPED
              ? 100
              : 0),
        positionSeconds: progress?.positionSeconds ?? null,
        durationSeconds: progress?.durationSeconds ?? null,
        completedAt: progress?.completedAt ?? null,
        orderIndex: lesson.orderIndex,
      };
    });

    const totalItems = lessons.length;

    // คำนวณเปอร์เซ็นต์ความคืบหน้าโดยรวม
    // นับเฉพาะรายการที่สถานะเป็น COMPLETED หรือ SKIPPED
    const roadmapAcc = items.reduce(
      (acc, item) => {
        // นับเฉพาะรายการที่เป็น COMPLETED หรือ SKIPPED
        // (ข้ามรายการที่ยัง IN_PROGRESS หรือ LOCKED)
        if (
          item.status !== LessonProgressStatus.COMPLETED &&
          item.status !== LessonProgressStatus.SKIPPED
        ) {
          // ข้ามรายการนี้
          return acc;
        }

        // รวมค่า progressPercent (fallback เป็น 0 ถ้าไม่มีค่า)
        acc.sum += Number(item.progressPercent) || 0;
        // เพิ่มตัวนับรายการที่ถูกนับ
        acc.count += 1;
        return acc;
      },
      // ค่าเริ่มต้น accumulator
      { sum: 0, count: 0 },
    );

    // ถ้าไม่มีรายการที่นับ ให้คืน 0 มิฉะนั้นคืนค่าเฉลี่ยปัดเป็นจำนวนเต็ม
    const progressPercent = roadmapAcc.count > 0 ? Math.round(roadmapAcc.sum / roadmapAcc.count) : 0;

    // ดึงสถานะ streak ของผู้ใช้ (ใช้ currentStreak > 0 เป็น COMPLETE)
    const { streak, isReward } = await this.streakService.getStreak(userId);
    const streakStatus: 'IN_PROGRESS' | 'COMPLETE' = streak.currentStreak > 0 ? 'COMPLETE' : 'IN_PROGRESS';

    return {
      chapterId,
      chapterTitle: chapter.chapter_title,
      progressPercent,
      nextAvailableLessonId,
      items,
      streakStatus,
      isReward,
    };
  }

  // Return roadmap for all chapters in a level
  async getLevelChapterRoadmaps(userId: string, levelId: number): Promise<ChapterRoadmapDto[]> {
    const chapters = await this.chapterRepository.find({
      where: { levelId },
      order: { chapter_orderIndex: 'ASC' },
    });

    // If no chapters, return empty array
    if (!chapters || chapters.length === 0) return [];

    // Map each chapter to its roadmap (in parallel)
    const promises = chapters.map((c) => this.getChapterRoadmap(userId, c.chapter_id));
    return Promise.all(promises);
  }
  
  // Mapping
  private toResponse(
    row: LessonProgress,
    location?: { chapterId?: number | null; levelId?: number | null },
  ): LessonProgressResponseDto {
    return {
      lessonId: row.lessonId,
      chapterId: location?.chapterId ?? null,
      levelId: location?.levelId ?? null,
      userId: row.userId,
      status: row.status,
      progressPercent:
        row.progressPercent != null
          ? Math.round(Number(row.progressPercent))
          : null,
      positionSeconds: row.positionSeconds ?? null,
      durationSeconds: row.durationSeconds ?? null,
      lastViewedAt: row.lastViewedAt ?? null,
      completedAt: row.completedAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async isChapterUnlockedForUser(
    userId: string,
    chapter: Chapter,
    chapterLessonIds: number[],
  ): Promise<boolean> {
    // ถ้าไม่มีบทเรียนในบทนี้ ให้ถือว่าเป็นบทที่ปลดล็อกแล้ว
    if (chapterLessonIds.length > 0) {
      const existing = await this.lessonProgressRepository.findOne({
        where: { userId, lessonId: In(chapterLessonIds) },
      });
      if (existing) {
        return true;
      }
    }

    // ตรวจสอบบทก่อนหน้าภายในระดับเดียวกัน
    const prevChapter = await this.chapterRepository.findOne({
      where: {
        levelId: chapter.levelId,
        chapter_orderIndex: LessThan(chapter.chapter_orderIndex),
      },
      order: { chapter_orderIndex: 'DESC' },
    });

    if (!prevChapter) {
      return true;
    }

    return this.isChapterCompletedForUser(userId, prevChapter.chapter_id);
  }

  // Check if a chapter is completed for a user
  private async isChapterCompletedForUser(
    userId: string,
    chapterId: number,
  ): Promise<boolean> {
    // ดึงบทเรียนทั้งหมดในบทนั้น
    const lessons = await this.lessonRepository.find({
      where: { chapter_id: chapterId },
      order: { orderIndex: 'ASC' },
    });

    // ถ้าไม่มีบทเรียนเลย ให้ถือว่าเป็นบทที่เสร็จสมบูรณ์แล้ว
    if (lessons.length === 0) {
      return true;
    }

    // ดึง IDs ของบทเรียน
    const lessonIds = lessons.map((l) => l.lesson_id);
    const progressRows = await this.lessonProgressRepository.find({
      where: { userId, lessonId: In(lessonIds) },
    });

    // ตรวจสอบว่าบทเรียนทั้งหมดถูกทำเครื่องหมายว่าเสร็จสมบูรณ์หรือไม่
    const completed = new Set(
      progressRows
        .filter(
          (p) =>
            p.status === LessonProgressStatus.COMPLETED ||
            p.status === LessonProgressStatus.SKIPPED,
        )
        .map((p) => p.lessonId),
    );

    return completed.size === lessonIds.length;
  }
}
