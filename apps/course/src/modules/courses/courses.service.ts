import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { Course } from './entities/course.entity';
import { CreateCourseDto, UpdateCourseDto, CourseResponseDto, CourseDetailResponseDto } from './dto';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) { }

  private buildPublicIntroVideoPath(mediaAssetId: number): string {
    return `/api/media/assets/${mediaAssetId}/url/public/redirect`;
  }

  private buildPublicCoverImagePath(mediaAssetId: number): string {
    return `/api/media/assets/${mediaAssetId}/image/url/public/redirect`;
  }

  async create(createCourseDto: CreateCourseDto): Promise<Course> {
    const payload: DeepPartial<Course> = {
      ownerUserId: Number(createCourseDto.ownerId ?? 0),
      title: createCourseDto.course_name,
      description: createCourseDto.course_detail,
      price: Number(createCourseDto.course_price ?? 0),
      isPublished: Boolean(createCourseDto.is_published ?? false),
      categoryId: createCourseDto.categoryId,
      level: createCourseDto.course_level ?? 'beginner',
      tags: createCourseDto.tags ?? [],
      coverMediaAssetId: createCourseDto.course_coverMediaId ?? undefined,
      introMediaAssetId: createCourseDto.course_introMediaId ?? undefined,
      durationSeconds: 0
    };

    const course = this.courseRepository.create(payload);
    const saved = await this.courseRepository.save(course);

    return {
      id: saved.id,
      cover_media_asset_id: saved.coverMediaAssetId ?? undefined,
      title: saved.title,
      media_assets_id: saved.introMediaAssetId ?? undefined,
      description: saved.description,
      level: saved.level,
      price: saved.price,
      tags: saved.tags ?? [],
      ownerUserId: saved.ownerUserId,
      isPublished: saved.isPublished,
      durationSeconds: saved.durationSeconds,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    } as unknown as Course;
  }

  async findAll(isPublished?: string): Promise<CourseResponseDto[]> {
    const query = this.courseRepository.createQueryBuilder('course');

    if (typeof isPublished === 'string') {
      const normalized = isPublished.trim().toLowerCase();
      if (['true', 'false', '1', '0'].includes(normalized)) {
        const value = normalized === 'true' || normalized === '1';
        query.where('course.isPublished = :value', { value });
      }
    }

    const rows = await query.getMany();

    return rows.map((c) => ({
      id: c.id,
      cover_media_asset_id: c.coverMediaAssetId ?? undefined,
      title: c.title,
      media_assets_id: c.introMediaAssetId ?? undefined,
      description: c.description,
      level: c.level,
      price: c.price,
      tags: c.tags ?? [],
      ownerUserId: c.ownerUserId,
      isPublished: c.isPublished,
      durationSeconds: c.durationSeconds,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  async findOne(id: string): Promise<CourseDetailResponseDto> {
    const courseId = Number(id);
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return {
      id: course.id,
      cover_media_asset_id: course.coverMediaAssetId ?? undefined,
      title: course.title,
      media_assets_id: course.introMediaAssetId ?? undefined,
      description: course.description,
      level: course.level,
      price: course.price,
      tags: course.tags ?? [],
      ownerUserId: course.ownerUserId,
      isPublished: course.isPublished,
      durationSeconds: course.durationSeconds,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      introVideoPath: course.introMediaAssetId
        ? this.buildPublicIntroVideoPath(course.introMediaAssetId)
        : undefined,
      coverImagePath: course.coverMediaAssetId
        ? this.buildPublicCoverImagePath(course.coverMediaAssetId)
        : undefined,
    };
  }

  async findByOwner(ownerId: string): Promise<Course[]> {
    return this.courseRepository.find({
      where: { ownerUserId: Number(ownerId) },
    });
  }

  async update(id: string, updateCourseDto: UpdateCourseDto): Promise<Course> {
    const courseId = Number(id);
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    // title
    if (updateCourseDto.course_name !== undefined) {
      course.title = updateCourseDto.course_name;
    }

    // description
    if (updateCourseDto.course_detail !== undefined) {
      course.description = updateCourseDto.course_detail;
    }

    // price
    if (updateCourseDto.course_price !== undefined) {
      course.price = Number(updateCourseDto.course_price);
    }

    // publish status
    if (updateCourseDto.is_published !== undefined) {
      course.isPublished = updateCourseDto.is_published;
    }

    // category
    if (updateCourseDto.categoryId !== undefined) {
      course.categoryId = updateCourseDto.categoryId;
    }

    // level 
    if (updateCourseDto.course_level !== undefined) {
      course.level = updateCourseDto.course_level;
    }

    // tags
    if (updateCourseDto.tags !== undefined) {
      course.tags = updateCourseDto.tags;
    }

    // cover media
    if (updateCourseDto.course_coverMediaId !== undefined) {
      course.coverMediaAssetId = updateCourseDto.course_coverMediaId ?? undefined;
    }

    // intro media
    if (updateCourseDto.course_introMediaId !== undefined) {
      course.introMediaAssetId = updateCourseDto.course_introMediaId ?? undefined;
    }

    return this.courseRepository.save(course);
  }


  async remove(id: string): Promise<void> {
    const courseId = Number(id);

    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    await this.courseRepository.remove(course);
  }
}
