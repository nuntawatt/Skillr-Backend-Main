import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { Course } from './entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  private buildPublicIntroVideoPath(mediaAssetId: number): string {
    // Path-only so frontend can prefix with MEDIA_ORIGIN from env.
    return `/api/media/assets/${mediaAssetId}/url/public/redirect`;
  }

  private buildPublicCoverImagePath(mediaAssetId: number): string {
    // Path-only so frontend can prefix with MEDIA_ORIGIN from env.
    return `/api/media/assets/${mediaAssetId}/image/url/public/redirect`;
  }

  async create(createCourseDto: CreateCourseDto): Promise<Course> {
    const isPublished = createCourseDto.is_published;

    const payload: DeepPartial<Course> = {
      ownerUserId:
        createCourseDto.ownerId !== undefined
          ? Number(createCourseDto.ownerId)
          : undefined,
      title: createCourseDto.title,
      description: createCourseDto.description,
      price: Number(createCourseDto.price ?? 0),
      isPublished: typeof isPublished === 'boolean' ? isPublished : false,
      categoryId: createCourseDto.categoryId,
      level: String(createCourseDto.level ?? 'beginner'),
      coverMediaAssetId: createCourseDto.coverMediaId ?? undefined,
      introMediaAssetId: createCourseDto.introMediaId ?? undefined,
      durationSeconds: 0,
    };

    const course = this.courseRepository.create(payload);
    return this.courseRepository.save(course);
  }

  async findAll(isPublished?: string): Promise<Course[]> {
    const query = this.courseRepository.createQueryBuilder('course');

    if (typeof isPublished === 'string') {
      const normalized = isPublished.trim().toLowerCase();
      if (['true', 'false', '1', '0'].includes(normalized)) {
        const value = normalized === 'true' || normalized === '1';
        query.where('course.isPublished = :value', { value });
      }
    }

    return query.getMany();
  }

  async findOne(
    id: string,
  ): Promise<Course & { introVideoPath?: string; coverImagePath?: string }> {
    const courseId = Number(id);
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    const introVideoPath = course.introMediaAssetId
      ? this.buildPublicIntroVideoPath(course.introMediaAssetId)
      : undefined;

    const coverImagePath = course.coverMediaAssetId
      ? this.buildPublicCoverImagePath(course.coverMediaAssetId)
      : undefined;

    return {
      ...course,
      introVideoPath,
      coverImagePath,
    };
  }

  async findByOwner(ownerId: string): Promise<Course[]> {
    return this.courseRepository.find({
      where: { ownerUserId: Number(ownerId) },
    });
  }

  async update(id: string, updateCourseDto: UpdateCourseDto): Promise<Course> {
    const course = await this.findOne(id);

    if (updateCourseDto.title !== undefined)
      course.title = updateCourseDto.title;
    if (updateCourseDto.description !== undefined)
      course.description = updateCourseDto.description;

    if (updateCourseDto.price !== undefined) {
      course.price = Number(updateCourseDto.price ?? 0);
    }

    if (updateCourseDto.is_published !== undefined) {
      course.isPublished = updateCourseDto.is_published;
    }

    if (updateCourseDto.categoryId !== undefined) {
      course.categoryId = updateCourseDto.categoryId;
    }

    if (updateCourseDto.level !== undefined) {
      course.level = String(updateCourseDto.level);
    }

    if (updateCourseDto.coverMediaId !== undefined) {
      course.coverMediaAssetId = updateCourseDto.coverMediaId ?? undefined;
    }

    if (updateCourseDto.introMediaId !== undefined) {
      course.introMediaAssetId = updateCourseDto.introMediaId ?? undefined;
    }

    // Intentionally ignore ownerId changes via update.
    return this.courseRepository.save(course);
  }

  async remove(id: string): Promise<void> {
    const course = await this.findOne(id);
    await this.courseRepository.remove(course);
  }
}
