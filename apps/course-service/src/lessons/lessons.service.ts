import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson, LessonType } from './entities/lesson.entity';
import { Chapter } from '../chapters/entities/chapter.entity';
import { Article } from '../articles/entities/article.entity';
import { Quizs } from '../quizs/entities/quizs.entity';
import { QuizsCheckpoint } from '../quizs/entities/checkpoint.entity';
import { VideoAsset } from '../media-videos/entities/video-asset.entity';
import { CreateLessonDto, UpdateLessonDto, LessonResponseDto } from './dto/lesson';

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Chapter)
    private readonly chapterRepository: Repository<Chapter>,
    @InjectRepository(QuizsCheckpoint)
    private readonly checkpointRepository: Repository<QuizsCheckpoint>,
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @InjectRepository(Quizs)
    private readonly quizRepo: Repository<Quizs>,
    @InjectRepository(QuizsCheckpoint)
    private readonly checkpointRepo: Repository<QuizsCheckpoint>,
    @InjectRepository(VideoAsset)
    private readonly videoRepo: Repository<VideoAsset>,
  ) { }

  // Create a new lesson
  async create(createLessonDto: CreateLessonDto): Promise<LessonResponseDto> {
    // ต้องมี title และ description (หรือเนื้อหาสำคัญอื่นๆ)
    // if (!createLessonDto.lesson_title || createLessonDto.lesson_title.trim() === '') {
    //   throw new BadRequestException('Lesson title is required');
    // }
    // if (!createLessonDto.lesson_description || createLessonDto.lesson_description.trim() === '') {
    //   throw new BadRequestException('Lesson description is required');
    // }
    // ตรวจสอบว่า chapter มีอยู่จริง
    const chapter = await this.chapterRepository.findOne({
      where: { chapter_id: createLessonDto.chapter_id },
    });

    if (!chapter) {
      throw new NotFoundException(`Chapter with ID ${createLessonDto.chapter_id} not found`);
    }

    // ดึง lessons ทั้งหมดใน chapter เรียงตามลำดับ
    const lessons = await this.lessonRepository.find({
      where: { chapter_id: createLessonDto.chapter_id },
      order: { orderIndex: 'ASC' },
    });

    let orderIndex: number;

    // หา checkpoint เดิม (ถ้ามี)
    const existingCheckpoint = lessons.find(
      (l) => l.lesson_type === LessonType.CHECKPOINT,
    );

    if (createLessonDto.lesson_type === LessonType.CHECKPOINT) {
      // ถ้ามี checkpoint เดิม → ลบทิ้งก่อน
      if (existingCheckpoint) {
        await this.lessonRepository.remove(existingCheckpoint);
        orderIndex = lessons.length - 1; // checkpoint ใหม่จะอยู่ท้ายสุดเสมอ
      } else {
        orderIndex = lessons.length; // checkpoint ใหม่จะอยู่ท้ายสุดเสมอ
      }
    } else {
      // ถ้าไม่ใช่ checkpoint

      // ถ้ามี checkpoint อยู่แล้ว → แทรกก่อน checkpoint
      if (existingCheckpoint) {
        orderIndex = existingCheckpoint.orderIndex;

        // ขยับ checkpoint ลงไป 1 ตำแหน่ง
        existingCheckpoint.orderIndex += 1;
        await this.lessonRepository.save(existingCheckpoint);
      } else {
        orderIndex = lessons.length;
      }
    }

    const lesson = this.lessonRepository.create({
      lesson_title: createLessonDto.lesson_title,
      lesson_description: createLessonDto.lesson_description,
      chapter_id: createLessonDto.chapter_id,
      lesson_type: createLessonDto.lesson_type,
      orderIndex: orderIndex,
      lesson_ImageUrl: createLessonDto.lesson_ImageUrl,
      lesson_videoUrl: createLessonDto.lesson_videoUrl,
      isPublished: createLessonDto.isPublished ?? false, // เริ่มต้นเป็น unpublished ถ้าไม่ระบุมา
    });

    const saved = await this.lessonRepository.save(lesson);

    return this.toResponseDto(saved);
  }

  // Get all lessons for a chapter
  async findByChapter(chapterId: number): Promise<LessonResponseDto[]> {
    const lessons = await this.lessonRepository.find({
      where: { chapter_id: chapterId },
      order: { orderIndex: 'ASC' },
    });

    return Promise.all(lessons.map((l) => this.toResponseDto(l)));
  }

  // Find a lesson by ID
  async findOne(id: number): Promise<LessonResponseDto> {
    const lesson = await this.lessonRepository.findOne({ where: { lesson_id: id } });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    // ถ้า lesson ยังไม่ publish ให้เช็คเนื้อหาตามประเภท
    if (!lesson.isPublished) {
      // ...existing code...
    }
    return await this.toResponseDto(lesson);
  }

  // Update a lesson
  async update(id: number, updateLessonDto: UpdateLessonDto): Promise<LessonResponseDto> {
    const lesson = await this.lessonRepository.findOne({ where: { lesson_id: id } });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    const originalType = lesson.lesson_type;

    // อัปเดตฟิลด์ที่ระบุใน DTO
    // ---------------- Basic Field Updates ----------------
    if (updateLessonDto.lesson_title !== undefined) {
      lesson.lesson_title = updateLessonDto.lesson_title;
    }

    if (updateLessonDto.lesson_description !== undefined) {
      lesson.lesson_description = updateLessonDto.lesson_description;
    }
    // ...existing code...

    if (updateLessonDto.lesson_ImageUrl !== undefined) {
      lesson.lesson_ImageUrl = updateLessonDto.lesson_ImageUrl;
    }

    if (updateLessonDto.lesson_videoUrl !== undefined) {
      lesson.lesson_videoUrl = updateLessonDto.lesson_videoUrl;
    }

    // บังคับ publish ทุกครั้งที่ update
    lesson.isPublished = true;

    // ---------------- Type Change Logic ----------------
    if (
      updateLessonDto.lesson_type !== undefined &&
      updateLessonDto.lesson_type !== originalType
    ) {
      const lessons = await this.lessonRepository.find({
        where: { chapter_id: lesson.chapter_id },
        order: { orderIndex: 'ASC' },
      });

      const existingCheckpoint = lessons.find(
        (l) =>
          l.lesson_type === LessonType.CHECKPOINT &&
          l.lesson_id !== lesson.lesson_id,
      );

      if (updateLessonDto.lesson_type === LessonType.CHECKPOINT) {
        // ถ้าจะเปลี่ยนเป็น checkpoint

        if (existingCheckpoint) {
          await this.lessonRepository.remove(existingCheckpoint);
        }

        // ย้าย lesson นี้ไปท้ายสุดเสมอ
        lesson.orderIndex = lessons.length - 1;
      }

      lesson.lesson_type = updateLessonDto.lesson_type;
    }

    // ---------------- Publish Flag ----------------
    if (updateLessonDto.isPublished !== undefined) {
      lesson.isPublished = updateLessonDto.isPublished;
    }

    // ---------------- Manual Order Change ----------------
    if (
      updateLessonDto.orderIndex !== undefined &&
      lesson.lesson_type !== LessonType.CHECKPOINT
    ) {
      lesson.orderIndex = updateLessonDto.orderIndex;
    }

    const saved = await this.lessonRepository.save(lesson);

    return this.toResponseDto(saved);
  }

  // Delete a lesson
  async remove(id: number): Promise<{ message: string }> {
    const lesson = await this.lessonRepository.findOne({ where: { lesson_id: id } });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    await this.lessonRepository.remove(lesson);
    return { message: `Lesson with ID ${id} deleted successfully` };
  }

  // Reorder lessons within a chapter
  async reorder(chapterId: number, lessonIds: number[]): Promise<LessonResponseDto[]> {
    const lessons = await this.lessonRepository.find({
      where: { chapter_id: chapterId },
    });

    if (lessons.length === 0) {
      return [];
    }

    if (!Array.isArray(lessonIds) || lessonIds.length === 0) {
      throw new BadRequestException('lessonIds is required');
    }

    if (lessonIds.length !== lessons.length) {
      throw new BadRequestException(
        `lessonIds must include all lessons in the chapter (expected ${lessons.length}, got ${lessonIds.length})`,
      );
    }

    const lessonMap = new Map(lessons.map((l) => [l.lesson_id, l]));

    for (const id of lessonIds) {
      if (!lessonMap.has(id)) {
        throw new BadRequestException(`Lesson ID ${id} does not belong to chapter ${chapterId}`);
      }
    }

    // กัน checkpoint ไม่ให้ไปอยู่กลาง chapter
    const checkpoint = lessons.find(
      (l) => l.lesson_type === LessonType.CHECKPOINT,
    );

    if (checkpoint) {
      const lastId = lessonIds[lessonIds.length - 1];

      if (checkpoint.lesson_id !== lastId) {
        throw new BadRequestException(
          'Checkpoint must always be the last lesson in the chapter',
        );
      }
    }

    // อัปเดต orderIndex ตามลำดับใหม่
    const updatedLessons: Lesson[] = [];

    for (let i = 0; i < lessonIds.length; i++) {
      const lesson = lessonMap.get(lessonIds[i]);
      if (lesson) {
        lesson.orderIndex = i;
        updatedLessons.push(lesson);
      }
    }

    // save ทีเดียว (ดีกว่า await ใน loop)
    await this.lessonRepository.save(updatedLessons);

    return await this.findByChapter(chapterId);
  }

  // Convert Lesson entity to LessonResponseDto
  private async toResponseDto(lesson: Lesson): Promise<LessonResponseDto> {
    const base: any = {
      lesson_id: lesson.lesson_id,
      lesson_title: lesson.lesson_title,
      lesson_description: lesson.lesson_description ?? undefined,
      lesson_type: lesson.lesson_type,
      orderIndex: lesson.orderIndex,
      chapter_id: lesson.chapter_id,

      lesson_ImageUrl: lesson.lesson_ImageUrl,
      lesson_videoUrl: lesson.lesson_videoUrl,

      isPublished: lesson.isPublished,
      // hasCheckpoint: false,
      createdAt: lesson.createdAt,
    };

    if (lesson.lesson_type === LessonType.CHECKPOINT) {
      try {
        const chk = await this.checkpointRepository.findOne({ where: { lessonId: lesson.lesson_id } });
        if (chk) {
          // attach checkpoint object only (do not expose hasCheckpoint boolean)
          base.checkpoint = {
            checkpoint_id: chk.checkpointId,
            checkpoint_score: chk.checkpointScore,
            checkpoint_type: chk.checkpointType,
            checkpoint_questions: chk.checkpointQuestions,
            checkpoint_option: chk.checkpointOption,
            // do not include checkpoint_answer here for student-facing responses
            checkpoint_explanation: chk.checkpointExplanation ?? null,
            createdAt: chk.createdAt,
            updatedAt: chk.updatedAt,
          };
        }
      } catch (err) {
        // ignore checkpoint errors and return base
      }
    }

    return base as LessonResponseDto;
  }
}
