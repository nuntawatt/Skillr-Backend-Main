import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import {
  CreateCourseDto,
  UpdateCourseDto,
  CourseResponseDto,
  CourseStructureResponseDto,
  LevelStructureDto,
  ChapterStructureDto,
  LessonStructureDto
} from './dto';
import { LessonType } from '../lessons/entities/lesson.entity';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) { }

  async create(createCourseDto: CreateCourseDto): Promise<CourseResponseDto> {
    const course = this.courseRepository.create({
      course_ownerId: createCourseDto.course_ownerId ?? 0,
      course_title: createCourseDto.course_title,
      course_description: createCourseDto.course_description,
      course_imageUrl: createCourseDto.course_imageUrl,
      course_tags: createCourseDto.course_tags ?? null,
      isPublished: createCourseDto.isPublished ?? false,
    });

    const saved = await this.courseRepository.save(course);
    return this.toResponseDto(saved);
  }

  async findAll(params?: {
    isPublished?: boolean;
    course_ownerId?: number;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<CourseResponseDto[]> {
    const query = this.courseRepository.createQueryBuilder('course');

    // เพิ่ม subquery เพื่อคำนวณจำนวนบททั้งหมดในแต่ละคอร์ส แล้วเลือกคอลัมน์นี้มาด้วยชื่อ course_totalChapter
    query.addSelect(
      (subQuery) =>
        subQuery
          .select('COUNT(ch.chapter_id)', 'cnt')
          .from('chapters', 'ch')
          .innerJoin('levels', 'l', 'l.level_id = ch.level_id')
          .where('l.course_id = course.course_id'),
      'course_totalChapter',
    );

    // กรองตามสถานะการเผยแพร่
    if (params?.isPublished !== undefined) {
      query.andWhere('course.isPublished = :isPublished', {
        isPublished: params.isPublished,
      });
    }

    // กรองตามผู้สร้างคอร์ส
    if (params?.course_ownerId !== undefined) {
      query.andWhere('course.course_ownerId = :course_ownerId', {
        course_ownerId: params.course_ownerId,
      });
    }

    // กรองตามคำค้นในชื่อหรือคำอธิบายคอร์ส (case-insensitive)
    if (params?.search) {
      const keyword = params.search.toLowerCase();
      query.andWhere(
        '(LOWER(course.course_title) LIKE :kw OR LOWER(course.course_description) LIKE :kw)', { kw: `%${keyword}%` }
      );
    }

    // จำกัดจำนวนผลลัพธ์และการแบ่งหน้า
    const limit = params?.limit && params.limit > 0 ? Math.min(params.limit, 100) : 50;
    const offset = params?.offset && params.offset >= 0 ? params.offset : 0;

    // เรียงลำดับตามวันที่สร้างล่าสุดก่อน
    query.orderBy('course.createdAt', 'DESC').take(limit).skip(offset);
    const { entities, raw } = await query.getRawAndEntities();

    /* getRawAndEntities จะคืนค่า raw เป็น array ของผลลัพธ์ดิบที่มีคอลัมน์ course_totalChapter อยู่ด้วย 
    ซึ่งจะนำมาผนวกกับ entities เพื่อสร้าง CourseResponseDto ที่มีข้อมูลจำนวนบททั้งหมดในแต่ละคอร์สด้วย */
    return entities.map((course, index) => {
      const total = Number(raw[index]?.course_totalChapter ?? 0);
      course.course_totalChapter = Number.isFinite(total) ? total : 0;
      return this.toResponseDto(course);
    });
  }

  async findOne(id: number): Promise<CourseResponseDto> {
    const course = await this.courseRepository.findOne({ where: { course_id: id } });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return this.toResponseDto(course);
  }

  // ดึงโครงสร้างแบบ nested ทั้งหมดของคอร์ส (ระดับ -> บท -> บทเรียน) พร้อมข้อมูล checkpoint ของบทเรียนที่เป็นประเภท checkpoint
  async getStructure(id: number): Promise<CourseStructureResponseDto> {
    // ดึงคอร์สพร้อมกับ Level Chapter และ Lesson ที่เกี่ยวข้อง
    const course = await this.courseRepository.findOne({
      where: { course_id: id },
      relations: [
        'course_levels',
        'course_levels.level_chapters',
        'course_levels.level_chapters.lessons',
      ],
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    // จัดเรียง Level Chapter และ Lesson ตามลำดับ orderIndex
    const sortedLevels = (course.course_levels || []).sort(
      (a, b) => a.level_orderIndex - b.level_orderIndex,
    );

    // สร้างโครงสร้างของ Level and Chapter โดยยังไม่รวมข้อมูล checkpoint
    const levels: LevelStructureDto[] = sortedLevels.map((level) => {
      const sortedChapters = (level.level_chapters || []).sort(
        (a, b) => a.chapter_orderIndex - b.chapter_orderIndex,
      );

      // สร้างโครงสร้างของ Chapter
      const chapters: ChapterStructureDto[] = sortedChapters.map((chapter) => {
        const sortedLessons = (chapter.lessons || []).sort(
          (a, b) => a.orderIndex - b.orderIndex,
        );

        // สร้างโครงสร้างของ Lesson
        const lessons: LessonStructureDto[] = sortedLessons.map((lesson) => ({
          lesson_id: lesson.lesson_id,
          lesson_title: lesson.lesson_title,
          lesson_type: lesson.lesson_type,
          lesson_description: lesson.lesson_description ?? undefined,
          orderIndex: lesson.orderIndex,
        }));

        // คืนค่าโครงสร้างของ Chapter พร้อมบทเรียนที่อยู่ภายใน
        return {
          chapter_id: chapter.chapter_id,
          chapter_title: chapter.chapter_title,
          orderIndex: chapter.chapter_orderIndex,
          lessons,
        };
      });

      // คืนค่าโครงสร้างของ Level พร้อมบทที่อยู่ภายใน
      return {
        level_id: level.level_id,
        level_title: level.level_title,
        orderIndex: level.level_orderIndex,
        chapters,
      };
    });

    // รวม lesson_id ของบทเรียนทั้งหมดในคอร์สเพื่อใช้ในการดึงข้อมูล checkpoint ในขั้นตอนถัดไป
    const lessonIds: number[] = [];
    for (const lvl of sortedLevels) {
      for (const ch of lvl.level_chapters || []) {
        for (const l of ch.lessons || []) {
          if (l && typeof l.lesson_id === 'number') lessonIds.push(l.lesson_id);
        }
      }
    }

    /* ดึงข้อมูล checkpoint -> Lesson Type -> checkpoint ทั้งหมดในคอร์สนี้มาเก็บไว้ใน map โดยใช้ lesson_id เป็น key
    เพื่อให้สามารถนำข้อมูล checkpoint มาผนวกกับบทเรียนที่เป็นประเภท checkpoint ได้ในขั้นตอนถัดไป */
    const checkpointMap = new Map<number, any>();
    if (lessonIds.length) {
      const rows: Array<any> = await this.courseRepository.query(
        `SELECT lesson_id, checkpoint_id, checkpoint_score, checkpoint_type, checkpoint_questions, checkpoint_option, checkpoint_answer, checkpoint_explanation, created_at, updated_at FROM quizs_checkpoint WHERE lesson_id = ANY($1)`,
        [lessonIds],
      );
      rows.forEach((r) => checkpointMap.set(Number(r.lesson_id), r));
    }

    // สร้างโครงสร้างของคอร์สที่มีข้อมูล checkpoint ผนวกกับบทเรียนที่เป็นประเภท checkpoint
    const finalLevels: LevelStructureDto[] = sortedLevels.map((level) => {
      const chapters: ChapterStructureDto[] = (level.level_chapters || []).map((chapter) => {
        
        // สำหรับบทเรียนที่เป็นประเภท checkpoint ให้ผนวกข้อมูล checkpoint จาก checkpointMap เข้าไปในโครงสร้างของบทเรียน
        const lessons: LessonStructureDto[] = (chapter.lessons || [])
          .filter((lesson) => {
            if (!lesson.isPublished) return false;
            return true;
          })
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((lesson) => {
            return {
              lesson_id: lesson.lesson_id,
              lesson_title: lesson.lesson_title,
              lesson_type: lesson.lesson_type,
              lesson_description: lesson.lesson_description ?? undefined,
              orderIndex: lesson.orderIndex,
              isPublished: lesson.isPublished,
            } as LessonStructureDto;
          });

        return {
          chapter_id: chapter.chapter_id,
          chapter_title: chapter.chapter_title,
          orderIndex: chapter.chapter_orderIndex,
          lessons,
        };
      });

      return {
        level_id: level.level_id,
        level_title: level.level_title,
        orderIndex: level.level_orderIndex,
        chapters,
      };
    });

    return {
      course_id: course.course_id,
      course_title: course.course_title,
      course_description: course.course_description,
      isPublished: course.isPublished,
      course_tags: course.course_tags ?? undefined,
      course_levels: finalLevels,
    };
  }

  // สร้างคอร์สใหม่
  async getStructureAdmin(id: number): Promise<CourseStructureResponseDto> {
    const course = await this.courseRepository.findOne({
      where: { course_id: id },
      relations: [
        'course_levels',
        'course_levels.level_chapters',
        'course_levels.level_chapters.lessons',
      ],
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    // จัดเรียง Level Chapter และ Lesson ตามลำดับ orderIndex
    const sortedLevels = (course.course_levels || []).sort(
      (a, b) => a.level_orderIndex - b.level_orderIndex,
    );

    // สร้างโครงสร้างของ Level and Chapter โดยยังไม่รวมข้อมูล checkpoint
    const lessonIds: number[] = [];
    for (const lvl of sortedLevels) {
      for (const ch of lvl.level_chapters || []) {
        for (const l of ch.lessons || []) {
          if (l && typeof l.lesson_id === 'number') lessonIds.push(l.lesson_id);
        }
      }
    }

    // ดึงข้อมูล checkpoint -> Lesson Type -> checkpoint ทั้งหมดในคอร์สนี้มาเก็บไว้ใน map โดยใช้ lesson_id เป็น key
    const checkpointMap = new Map<number, any>();
    if (lessonIds.length) {
      const rows: Array<any> = await this.courseRepository.query(
        `SELECT lesson_id, checkpoint_id, checkpoint_score, checkpoint_type, checkpoint_questions, checkpoint_option, checkpoint_answer, checkpoint_explanation, created_at, updated_at FROM quizs_checkpoint WHERE lesson_id = ANY($1)`,
        [lessonIds],
      );
      rows.forEach((r) => checkpointMap.set(Number(r.lesson_id), r));
    }

    // สร้างโครงสร้างของคอร์สที่มีข้อมูล checkpoint ผนวกกับบทเรียนที่เป็นประเภท checkpoint
    const finalLevels: LevelStructureDto[] = sortedLevels.map((level) => {
      const chapters: ChapterStructureDto[] = (level.level_chapters || []).map((chapter) => {
        const lessons: LessonStructureDto[] = (chapter.lessons || [])
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((lesson) => {
            const cp = checkpointMap.get(lesson.lesson_id);
            return {
              lesson_id: lesson.lesson_id,
              lesson_title: lesson.lesson_title,
              lesson_type: lesson.lesson_type,
              lesson_description: lesson.lesson_description ?? undefined,
              orderIndex: lesson.orderIndex,
              isPublished: lesson.isPublished,
            } as LessonStructureDto;
          });

        return {
          chapter_id: chapter.chapter_id,
          chapter_title: chapter.chapter_title,
          orderIndex: chapter.chapter_orderIndex,
          lessons,
        };
      });

      return {
        level_id: level.level_id,
        level_title: level.level_title,
        orderIndex: level.level_orderIndex,
        chapters,
      };
    });

    return {
      course_id: course.course_id,
      course_title: course.course_title,
      course_description: course.course_description,
      isPublished: course.isPublished,
      course_tags: course.course_tags ?? undefined,
      course_levels: finalLevels,
    };
  }

  // Update Course by ID
  async update(id: number, updateCourseDto: UpdateCourseDto): Promise<CourseResponseDto> {
    const course = await this.courseRepository.findOne({ where: { course_id: id } });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    // Update fields if specified
    if (updateCourseDto.course_title !== undefined) course.course_title = updateCourseDto.course_title;
    if (updateCourseDto.course_description !== undefined) course.course_description = updateCourseDto.course_description;
    if (updateCourseDto.course_imageUrl !== undefined) course.course_imageUrl = updateCourseDto.course_imageUrl;
    if (updateCourseDto.course_tags !== undefined) course.course_tags = updateCourseDto.course_tags ?? null;

    if (updateCourseDto.isPublished !== undefined) {
      course.isPublished = updateCourseDto.isPublished;
    }

    const saved = await this.courseRepository.save(course);
    return this.toResponseDto(saved);
  }

  // Delete Course by ID (Cascade delete จะทำงานลบ Level, Chapter และ Lesson ที่อยู่ภายในคอร์สนี้ทั้งหมดโดยอัตโนมัติ)
  async remove(id: number): Promise<{ message: string }> {
    const course = await this.courseRepository.findOne({ where: { course_id: id } });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    await this.courseRepository.remove(course);
    return { message: `Course with ID ${id} deleted successfully` };
  }

  // แปลง Entity เป็น DTO สำหรับการตอบกลับ API
  private toResponseDto(course: Course): CourseResponseDto {
    return {
      course_id: course.course_id,
      course_ownerId: course.course_ownerId,
      course_title: course.course_title,
      course_description: course.course_description,
      course_tags: course.course_tags ?? undefined,
      course_imageUrl: course.course_imageUrl ?? undefined,
      course_totalChapter: course.course_totalChapter ?? 0,
      isPublished: course.isPublished,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    };
  }
}
