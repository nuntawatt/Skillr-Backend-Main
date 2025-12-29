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
    return `/api/media/assets/${mediaAssetId}/url/public/redirect`;
  }

  private buildPublicCoverImagePath(mediaAssetId: number): string {
    return `/api/media/assets/${mediaAssetId}/image/url/public/redirect`;
  }

  async create(createCourseDto: CreateCourseDto): Promise<Course> {
    // Persist only the minimal fields provided by the frontend.
    // Set a safe default for ownerUserId so DB constraints are satisfied.
    const payload: DeepPartial<Course> = {
      ownerUserId: 0,
      title: createCourseDto.title,
      description: createCourseDto.description,
      price: Number(createCourseDto.price ?? 0),
      isPublished: false,
      categoryId: createCourseDto.categoryId,
      level: String(createCourseDto.level ?? 'beginner'),
      tags: createCourseDto.tags ?? undefined,
      coverMediaAssetId: createCourseDto.coverMediaId ?? undefined,
      introMediaAssetId: createCourseDto.introMediaId ?? undefined,
      durationSeconds: 0,
    };

    const course = this.courseRepository.create(payload);
    const saved = await this.courseRepository.save(course);
    // Return object with fields ordered as requested by frontend
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

  async findAll(isPublished?: string): Promise<Course[]> {
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
    } as unknown as Course));
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

    // Return with requested ordering: id, cover image id, title, media_assets_id (intro), description, level, price, tags
    return {
      id: course.id,
      cover_media_asset_id: course.coverMediaAssetId ?? undefined,
      title: course.title,
      media_assets_id: course.introMediaAssetId ?? undefined,
      description: course.description,
      level: course.level,
      price: course.price,
      tags: course.tags ?? [],
      introVideoPath,
      coverImagePath,
      ownerUserId: course.ownerUserId,
      isPublished: course.isPublished,
      durationSeconds: course.durationSeconds,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    } as unknown as Course & { introVideoPath?: string; coverImagePath?: string };
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

    if ((updateCourseDto as any).tags !== undefined) {
      course.tags = (updateCourseDto as any).tags;
    }

    if (updateCourseDto.coverMediaId !== undefined) {
      course.coverMediaAssetId = updateCourseDto.coverMediaId ?? undefined;
    }

    if (updateCourseDto.introMediaId !== undefined) {
      course.introMediaAssetId = updateCourseDto.introMediaId ?? undefined;
    }

    return this.courseRepository.save(course);
  }

  async remove(id: string): Promise<void> {
    const course = await this.findOne(id);
    await this.courseRepository.remove(course);
  }
}
