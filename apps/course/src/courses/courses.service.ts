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
      ownerUserId: createCourseDto.ownerUserId ?? 0,
      title: createCourseDto.title,
      description: createCourseDto.description,
      coverMediaAssetId: createCourseDto.coverMediaAssetId,
      introMediaAssetId: createCourseDto.introMediaAssetId,
      estimateTimeSeconds: createCourseDto.estimateTimeSeconds ?? 0,
      isPublished: createCourseDto.isPublished ?? false,
      categoryId: createCourseDto.categoryId,
    });

    const saved = await this.courseRepository.save(course);
    return this.toResponseDto(saved);
  }

  // Find all courses with optional filters
  async findAll(params?: {
    isPublished?: boolean;
    ownerUserId?: number;
    categoryId?: number;
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

    if (params?.ownerUserId !== undefined) {
      query.andWhere('course.ownerUserId = :ownerUserId', {
        ownerUserId: params.ownerUserId,
      });
    }

    if (params?.categoryId !== undefined) {
      query.andWhere('course.categoryId = :categoryId', {
        categoryId: params.categoryId,
      });
    }

    if (params?.search) {
      const keyword = params.search.toLowerCase();
      query.andWhere(
        '(LOWER(course.title) LIKE :kw OR LOWER(course.description) LIKE :kw)',
        { kw: `%${keyword}%` },
      );
    }

    const limit = params?.limit && params.limit > 0 ? Math.min(params.limit, 100) : 50;
    const offset = params?.offset && params.offset >= 0 ? params.offset : 0;

    query.orderBy('course.createdAt', 'DESC').take(limit).skip(offset);

    const courses = await query.getMany();
    return courses.map((c) => this.toResponseDto(c));
  }

  // Find a single course by ID
  async findOne(id: number): Promise<CourseResponseDto> {
    const course = await this.courseRepository.findOne({ where: { id } });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return this.toResponseDto(course);
  }

  // Get the full nested structure of a course
  async getStructure(id: number): Promise<CourseStructureResponseDto> {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: [
        'levels',
        'levels.chapters',
        'levels.chapters.lessons',
      ],
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    // Sort levels by orderIndex
    const sortedLevels = (course.levels || []).sort(
      (a, b) => a.orderIndex - b.orderIndex,
    );

    const levels: LevelStructureDto[] = sortedLevels.map((level) => {
      // Sort chapters by orderIndex
      const sortedChapters = (level.chapters || []).sort(
        (a, b) => a.orderIndex - b.orderIndex,
      );

      const chapters: ChapterStructureDto[] = sortedChapters.map((chapter) => {
        // Sort lessons by orderIndex
        const sortedLessons = (chapter.lessons || []).sort(
          (a, b) => a.orderIndex - b.orderIndex,
        );

        const lessons: LessonStructureDto[] = sortedLessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          type: lesson.type,
          refSource: lesson.refSource,
          refId: lesson.refId,
          orderIndex: lesson.orderIndex,
        }));

        return {
          id: chapter.id,
          title: chapter.title,
          orderIndex: chapter.orderIndex,
          lessons,
        };
      });

      return {
        id: level.id,
        title: level.title,
        orderIndex: level.orderIndex,
        chapters,
      };
    });

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      isPublished: course.isPublished,
      levels,
    };
  }

  // Update a course
  async update(id: number, updateCourseDto: UpdateCourseDto): Promise<CourseResponseDto> {
    const course = await this.courseRepository.findOne({ where: { id } });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    if (updateCourseDto.title !== undefined) {
      course.title = updateCourseDto.title;
    }

    if (updateCourseDto.description !== undefined) {
      course.description = updateCourseDto.description;
    }

    if (updateCourseDto.coverMediaAssetId !== undefined) {
      course.coverMediaAssetId = updateCourseDto.coverMediaAssetId;
    }

    if (updateCourseDto.introMediaAssetId !== undefined) {
      course.introMediaAssetId = updateCourseDto.introMediaAssetId;
    }

    if (updateCourseDto.estimateTimeSeconds !== undefined) {
      course.estimateTimeSeconds = updateCourseDto.estimateTimeSeconds;
    }

    if (updateCourseDto.isPublished !== undefined) {
      course.isPublished = updateCourseDto.isPublished;
    }

    if (updateCourseDto.categoryId !== undefined) {
      course.categoryId = updateCourseDto.categoryId;
    }

    const saved = await this.courseRepository.save(course);
    return this.toResponseDto(saved);
  }

  // Delete a course and all nested entities (cascades)
  async remove(id: number): Promise<void> {
    const course = await this.courseRepository.findOne({ where: { id } });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    await this.courseRepository.remove(course);
  }

  // Save full course structure (transactional)
  async saveStructure(courseId: number, dto: CourseStructureSaveDto): Promise<CourseStructureResponseDto> {
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException(`Course with ID ${courseId} not found`);

    await this.dataSource.transaction(async (manager) => {
      // delete existing levels (cascades to chapters and lessons)
      await manager.delete(Level, { courseId });

      // create new levels/chapters/lessons
      for (const lv of dto.levels || []) {
        const level = this.levelRepository.create({
          title: lv.title,
          orderIndex: lv.orderIndex,
          courseId,
        });

        const savedLevel = await manager.save(Level, level);

        for (const ch of lv.chapters || []) {
          const chapter = this.chapterRepository.create({
            title: ch.title,
            orderIndex: ch.orderIndex,
            levelId: savedLevel.id,
          });

          const savedChapter = await manager.save(Chapter, chapter);

          for (const les of ch.lessons || []) {
            const lesson = this.lessonRepository.create({
              title: les.title,
              type: les.type as any,
              refSource: (les.refSource as any) ?? 'course',
              refId: les.refId ?? 0,
              orderIndex: les.orderIndex,
              chapterId: savedChapter.id,
            });

            await manager.save(Lesson, lesson);
          }
        }
      }
    });

    // update course basic fields if provided
    if (dto.title !== undefined) course.title = dto.title;
    if (dto.description !== undefined) course.description = dto.description;
    await this.courseRepository.save(course);

    return this.getStructure(courseId);
  }

  // Convert Course entity to CourseResponseDto
  private toResponseDto(course: Course): CourseResponseDto {
    return {
      id: course.id,
      ownerUserId: course.ownerUserId,
      title: course.title,
      description: course.description,
      coverMediaAssetId: course.coverMediaAssetId ?? undefined,
      introMediaAssetId: course.introMediaAssetId ?? undefined,
      estimateTimeSeconds: course.estimateTimeSeconds,
      isPublished: course.isPublished,
      categoryId: course.categoryId ?? undefined,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    };
  }
}
