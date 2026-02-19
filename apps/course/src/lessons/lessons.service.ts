import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson, LessonType } from './entities/lesson.entity';
import { Chapter } from '../chapters/entities/chapter.entity';
import { CreateLessonDto, UpdateLessonDto, LessonResponseDto } from './dto/lesson';

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Chapter)
    private readonly chapterRepository: Repository<Chapter>,
  ) {}

  // Create a new lesson
  async create(createLessonDto: CreateLessonDto): Promise<LessonResponseDto> {
    // อนุมัติ chapter มีอยู่จริง
    const chapter = await this.chapterRepository.findOne({
      where: { chapter_id: createLessonDto.chapter_id },
    });

    if (!chapter) {
      throw new NotFoundException(`Chapter with ID ${createLessonDto.chapter_id} not found`);
    }

    // สร้าง orderIndex อัตโนมัติถ้าไม่ได้ระบุ
    let orderIndex = createLessonDto.orderIndex;
    if (orderIndex === undefined) {
      const maxOrderResult = await this.lessonRepository
        .createQueryBuilder('lesson')
        .where('lesson.chapter_id = :chapterId', { chapterId: createLessonDto.chapter_id })
        .select('MAX(lesson.order_index)', 'maxOrder')
        .getRawOne();
      orderIndex = (maxOrderResult?.maxOrder ?? -1) + 1;
    }

    const lesson = this.lessonRepository.create({
      lesson_title: createLessonDto.lesson_title,
      lesson_description: createLessonDto.lesson_description,
      chapter_id: createLessonDto.chapter_id,
      lesson_type: createLessonDto.lesson_type,
      ref_id: createLessonDto.ref_id,
      orderIndex: orderIndex,
      lesson_ImageUrl: createLessonDto.lesson_ImageUrl,
      lesson_videoUrl: createLessonDto.lesson_videoUrl,
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

    return lessons.map((l) => this.toResponseDto(l));
  }

  // Find a lesson by ID
  async findOne(id: number): Promise<LessonResponseDto> {
    const lesson = await this.lessonRepository.findOne({ where: { lesson_id: id } });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    return this.toResponseDto(lesson);
  }

  // Update a lesson
  async update(id: number, updateLessonDto: UpdateLessonDto): Promise<LessonResponseDto> {
    const lesson = await this.lessonRepository.findOne({ where: { lesson_id: id } });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    if (updateLessonDto.lesson_title !== undefined) {
      lesson.lesson_title = updateLessonDto.lesson_title;
    }

    if (updateLessonDto.lesson_description !== undefined) {
      lesson.lesson_description = updateLessonDto.lesson_description;
    }

    if (updateLessonDto.lesson_type !== undefined) {
      lesson.lesson_type = updateLessonDto.lesson_type;
    }

    if (updateLessonDto.ref_id !== undefined) {
      lesson.ref_id = updateLessonDto.ref_id;
    }

    if (updateLessonDto.orderIndex !== undefined) {
      lesson.orderIndex = updateLessonDto.orderIndex;
    }

    if (updateLessonDto.lesson_ImageUrl !== undefined) {
      lesson.lesson_ImageUrl = updateLessonDto.lesson_ImageUrl;
    }

    if (updateLessonDto.lesson_videoUrl !== undefined) {
      lesson.lesson_videoUrl = updateLessonDto.lesson_videoUrl;
    }

    const saved = await this.lessonRepository.save(lesson);
    return this.toResponseDto(saved);
  }

  // Delete a lesson
  async remove(id: number): Promise<void> {
    const lesson = await this.lessonRepository.findOne({ where: { lesson_id: id } });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    await this.lessonRepository.remove(lesson);
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

    const provided = new Set(lessonIds);
    for (const lesson of lessons) {
      if (!provided.has(lesson.lesson_id)) {
        throw new BadRequestException(
          `lessonIds must include all lessons in the chapter; missing ${lesson.lesson_id}`,
        );
      }
    }

    for (let i = 0; i < lessonIds.length; i++) {
      const lesson = lessonMap.get(lessonIds[i]);
      if (lesson) {
        lesson.orderIndex = i;
        await this.lessonRepository.save(lesson);
      }
    }

    return this.findByChapter(chapterId);
  }

  // Convert Lesson entity to LessonResponseDto
  private toResponseDto(lesson: Lesson): LessonResponseDto {
    return {
      lesson_id: lesson.lesson_id,
      lesson_title: lesson.lesson_title,
      lesson_description: lesson.lesson_description,
      lesson_type: lesson.lesson_type,
      ref_id: lesson.ref_id,
      orderIndex: lesson.orderIndex,
      chapter_id: lesson.chapter_id,
      
      lesson_ImageUrl: lesson.lesson_ImageUrl,
      lesson_videoUrl: lesson.lesson_videoUrl,

      createdAt: lesson.createdAt,
    };
  }
}
