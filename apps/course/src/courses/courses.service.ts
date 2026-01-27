import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Course } from './entities/course.entity';
import { CreateCourseDto, UpdateCourseDto, CourseResponseDto, CourseStructureResponseDto, LevelStructureDto, ChapterStructureDto, LessonStructureDto } from './dto';
import { CourseStructureSaveDto, LevelSaveDto, ChapterSaveDto, LessonSaveDto } from './dto/course-structure-save.dto';
import { Level } from '../levels/entities/level.entity';
import { Chapter } from '../chapters/entities/chapter.entity';
import { Lesson } from '../lessons/entities/lesson.entity';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    private readonly dataSource: DataSource,
    @InjectRepository(Level)
    private readonly levelRepository: Repository<Level>,
    @InjectRepository(Chapter)
    private readonly chapterRepository: Repository<Chapter>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
  ) { }

  // Create a new course
  async create(createCourseDto: CreateCourseDto): Promise<CourseResponseDto> {
    const course = this.courseRepository.create({
      course_ownerId: createCourseDto.course_ownerId ?? 0,
      course_title: createCourseDto.course_title,
      course_description: createCourseDto.course_description,
      course_imageId: createCourseDto.course_imageId,
      course_tags: createCourseDto.course_tags ?? null,
      isPublished: createCourseDto.isPublished ?? false,
    });

    const saved = await this.courseRepository.save(course);
    return this.toResponseDto(saved);
  }

  // Find all courses with optional filters
  async findAll(params?: {
    isPublished?: boolean;
    course_ownerId?: number;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<CourseResponseDto[]> {
    const query = this.courseRepository.createQueryBuilder('course');

    if (params?.isPublished !== undefined) {
      query.andWhere('course.isPublished = :isPublished', {
        isPublished: params.isPublished,
      });
    }

    if (params?.course_ownerId !== undefined) {
      query.andWhere('course.course_ownerId = :course_ownerId', {
        course_ownerId: params.course_ownerId,
      });
    }

    if (params?.search) {
      const keyword = params.search.toLowerCase();
      query.andWhere(
        '(LOWER(course.course_title) LIKE :kw OR LOWER(course.course_description) LIKE :kw)',{ kw: `%${keyword}%` }
      );
    }

    const limit = params?.limit && params.limit > 0 ? Math.min(params.limit, 100) : 50;
    const offset = params?.offset && params.offset >= 0 ? params.offset : 0;

    query.orderBy('course.createdAt', 'DESC').take(limit).skip(offset);

    const courses = await query.getMany();
    return courses.map((course) => this.toResponseDto(course));
  }

  // Find a single course by ID
  async findOne(id: number): Promise<CourseResponseDto> {
    const course = await this.courseRepository.findOne({ where: { course_id: id } });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return this.toResponseDto(course);
  }

  // Get the full nested structure of a course
  async getStructure(id: number): Promise<CourseStructureResponseDto> {
    const course = await this.courseRepository.findOne({where: { course_id: id },
      relations: [
        'course_levels',
        'course_levels.level_chapters',
        'course_levels.level_chapters.lessons',
      ],
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    // Sort levels by orderIndex (entity uses snake_case fields)
    const sortedLevels = (course.course_levels || []).sort((a, b) => a.level_orderIndex - b.level_orderIndex);

    const levels: LevelStructureDto[] = sortedLevels.map((level) => {
      // Sort chapters by orderIndex
      const sortedChapters = (level.level_chapters || []).sort((a, b) => a.chapter_orderIndex - b.chapter_orderIndex);

      const chapters: ChapterStructureDto[] = sortedChapters.map((chapter) => {
        // Sort lessons by orderIndex
        const sortedLessons = (chapter.lessons || []).sort(
          (a, b) => a.orderIndex - b.orderIndex,
        );

        const lessons: LessonStructureDto[] = sortedLessons.map((lesson) => ({
          lesson_id: lesson.lesson_id,
          lesson_title: lesson.lesson_title,
          lesson_type: lesson.lesson_type,
          ref_id: lesson.ref_id,
          orderIndex: lesson.orderIndex,
        }));

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
      course_levels: levels,
    };
  }

  // Update a course
  async update(id: number, updateCourseDto: UpdateCourseDto): Promise<CourseResponseDto> {
    const course = await this.courseRepository.findOne({ where: { course_id: id } });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    if (updateCourseDto.course_title !== undefined) course.course_title = updateCourseDto.course_title;
    if (updateCourseDto.course_description !== undefined) course.course_description = updateCourseDto.course_description;
    if (updateCourseDto.course_imageId !== undefined) course.course_imageId = updateCourseDto.course_imageId;
    if (updateCourseDto.course_tags !== undefined) course.course_tags = updateCourseDto.course_tags ?? null;

    if (updateCourseDto.isPublished !== undefined) {
      course.isPublished = updateCourseDto.isPublished;
    }

    const saved = await this.courseRepository.save(course);
    return this.toResponseDto(saved);
  }

  // Delete a course and all nested entities (cascades)
  async remove(id: number): Promise<void> {
    const course = await this.courseRepository.findOne({ where: { course_id: id } });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    await this.courseRepository.remove(course);
  }

  // Save full course structure (transactional)
  async saveStructure(courseId: number, dto: CourseStructureSaveDto): Promise<CourseStructureResponseDto> {
    const course = await this.courseRepository.findOne({ where: { course_id: courseId } });
    if (!course) throw new NotFoundException(`Course with ID ${courseId} not found`);

    await this.dataSource.transaction(async (manager) => {
      // delete existing levels (cascades to chapters and lessons)
      await manager.delete(Level, { course_id: courseId });

      // create new levels/chapters/lessons
      for (const lv of dto.levels || []) {
        const level = this.levelRepository.create({
          level_title: lv.title,
          level_orderIndex: lv.orderIndex,
          course_id: courseId,
        });

        const savedLevel = await manager.save(Level, level);

        for (const ch of lv.chapters || []) {
          const chapter = this.chapterRepository.create({
            chapter_title: ch.title,
            chapter_orderIndex: ch.orderIndex,
            levelId: savedLevel.level_id,
          });

          const savedChapter = await manager.save(Chapter, chapter);

          for (const les of ch.lessons || []) {
            const lesson = this.lessonRepository.create({
              lesson_title: les.title,
              lesson_type: les.type as any,
              ref_id: les.ref_id ?? 0,
              orderIndex: les.orderIndex,
              chapter_id: savedChapter.chapter_id,
            });

            await manager.save(Lesson, lesson);
          }
        }
      }
    });

    // update course basic fields if provided
    if (dto.course_title !== undefined) course.course_title = dto.course_title;
    if (dto.course_description !== undefined) course.course_description = dto.course_description;
    if ((dto as any).course_tags !== undefined) course.course_tags = (dto as any).course_tags ?? null;
    await this.courseRepository.save(course);

    return this.getStructure(courseId);
  }

  // Convert Course entity to CourseResponseDto
  private toResponseDto(course: Course): CourseResponseDto {
    return {
      course_id: course.course_id,
      course_ownerId: course.course_ownerId,
      course_title: course.course_title,
      course_description: course.course_description,
      course_tags: course.course_tags ?? undefined,
      course_imageId: course.course_imageId ?? undefined,
      isPublished: course.isPublished,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    };
  }
}
