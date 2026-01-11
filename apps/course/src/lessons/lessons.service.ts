import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from './entities/lesson.entity';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { LessonResource, LessonResourceType } from './entities/lesson-resource.entity';
import { CreateLessonResourceDto } from './dto/create-lesson-resource.dto';

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(LessonResource)
    private readonly lessonResourceRepository: Repository<LessonResource>,
  ) { }

  async create(createLessonDto: CreateLessonDto): Promise<Lesson> {
    // incoming values - DTO may be string if transform isn't enabled globally
    const lesson = this.lessonRepository.create({
      courseId:
        createLessonDto.courseId !== undefined && createLessonDto.courseId !== null
          ? Number(createLessonDto.courseId)
          : null,
      title: createLessonDto.title,
      contentText: createLessonDto.content_text,
      mediaAssetId:
        createLessonDto.media_asset_id !== undefined && createLessonDto.media_asset_id !== null
          ? Number(createLessonDto.media_asset_id)
          : null,
      position: Number(createLessonDto.position ?? 0),
    });

    return this.lessonRepository.save(lesson);
  }

  async findAll(courseId?: number): Promise<Lesson[]> {
    const query = this.lessonRepository
      .createQueryBuilder('lesson')
      .leftJoinAndSelect('lesson.course', 'course')
      .orderBy('lesson.position', 'ASC');

    if (courseId !== undefined) {
      query.where('lesson.courseId = :courseId', { courseId });
    }

    return query.getMany();
  }

  async findOne(id: number): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['course', 'resources'],
    });
    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }
    return lesson;
  }

  private getMediaBaseUrl() {
    const baseUrl = process.env.MEDIA_SERVICE_URL;
    if (!baseUrl) {
      throw new ConflictException('MEDIA_SERVICE_URL is not configured');
    }
    return baseUrl.replace(/\/+$/, '');
  }

  private async assertMediaReady(mediaAssetId: number, authorization?: string) {
    // NOTE: This uses the global fetch API - ensure Node v18+ or polyfill (node-fetch) is available
    const url = `${this.getMediaBaseUrl()}/media/assets/${mediaAssetId}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: authorization ? { Authorization: authorization } : {},
    });

    if (res.status === 404) {
      throw new NotFoundException('media asset not found');
    }
    if (res.status === 403) {
      throw new ConflictException('not allowed to access media asset');
    }
    if (!res.ok) {
      throw new ConflictException('unable to validate media asset');
    }

    const data = (await res.json()) as unknown;
    const asset =
      typeof data === 'object' && data !== null
        ? (data as Record<string, unknown>)
        : {};

    const type = typeof asset['type'] === 'string' ? asset['type'] : undefined;
    const status =
      typeof asset['status'] === 'string' ? asset['status'] : undefined;

    if (type !== 'video') {
      throw new BadRequestException('media asset is not a video');
    }
    if (status !== 'ready') {
      throw new ConflictException('media asset is not ready');
    }
  }

  async createResource(
    lessonId: number,
    dto: CreateLessonResourceDto,
    authorization?: string
  ) {
    // reuse findOne to validate lesson exists
    const lesson = await this.findOne(lessonId);

    if (dto.type === LessonResourceType.VIDEO) {
      if (!dto.media_asset_id) {
        throw new BadRequestException('media_asset_id is required for video');
      }
      await this.assertMediaReady(dto.media_asset_id, authorization);
    }

    const resource = this.lessonResourceRepository.create({
      lesson: lesson,
      type: dto.type,
      title: dto.title,
      url: dto.url,
      filename: dto.filename,
      mimeType: dto.mime_type,
      mediaAssetId: dto.media_asset_id ?? null,
      meta: dto.meta,
      position: dto.position
    });

    const saved = await this.lessonResourceRepository.save(resource);
    return { resourceId: saved.id };
  }

  async update(id: number, updateLessonDto: UpdateLessonDto): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({ where: { id } });
    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    // apply patch-only updates (do not overwrite with undefined)
    if (updateLessonDto.title !== undefined) {
      lesson.title = updateLessonDto.title;
    }
    if (updateLessonDto.content_text !== undefined) {
      lesson.contentText = updateLessonDto.content_text;
    }
    if (updateLessonDto.media_asset_id !== undefined) {
      lesson.mediaAssetId =
        updateLessonDto.media_asset_id !== null && updateLessonDto.media_asset_id !== undefined
          ? Number(updateLessonDto.media_asset_id)
          : null;
    }
    if (updateLessonDto.position !== undefined) {
      lesson.position = Number(updateLessonDto.position);
    }
    if (updateLessonDto.courseId !== undefined) {
      lesson.courseId =
        updateLessonDto.courseId !== null && updateLessonDto.courseId !== undefined
          ? Number(updateLessonDto.courseId)
          : null;
    }

    return this.lessonRepository.save(lesson);
  }

  async remove(id: number): Promise<void> {
    const lesson = await this.findOne(id);
    await this.lessonRepository.remove(lesson);
  }
}
