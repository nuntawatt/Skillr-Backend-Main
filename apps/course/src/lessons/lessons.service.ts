import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from './entities/lesson.entity';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { LessonResource, LessonResourceType } from './entities/lesson-resource.entity';
import { CreateLessonResourceDto } from './dto/create-lesson-resource.dto';

@Injectable()
export class LessonsService {
  private readonly logger = new Logger(LessonsService.name);

  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(LessonResource)
    private readonly lessonResourceRepository: Repository<LessonResource>,
  ) { }

  async create(createLessonDto: CreateLessonDto): Promise<Lesson> {
    // Auto-generate position (get max position + 1)
    const maxPositionResult = await this.lessonRepository
      .createQueryBuilder('lesson')
      .select('MAX(lesson.position)', 'maxPosition')
      .getRawOne();
    const nextPosition = (maxPositionResult?.maxPosition ?? -1) + 1;

    const lesson = this.lessonRepository.create({
      title: createLessonDto.title,
      contentText: createLessonDto.content_text,
      mediaAssetId:
        createLessonDto.media_asset_id !== undefined && createLessonDto.media_asset_id !== null
          ? Number(createLessonDto.media_asset_id)
          : null,
      pdfMediaAssetId:
        createLessonDto.pdf_media_asset_id !== undefined && createLessonDto.pdf_media_asset_id !== null
          ? Number(createLessonDto.pdf_media_asset_id)
          : null,
      position: nextPosition,
    });

    return this.lessonRepository.save(lesson);
  }

  async findAll(courseId?: number): Promise<Lesson[]> {
    const query = this.lessonRepository
      .createQueryBuilder('lesson')
      .leftJoinAndSelect('lesson.course', 'course')
      .orderBy('lesson.position', 'ASC');

    if (courseId !== undefined) {
      query.where('lesson.course_id = :courseId', { courseId });
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

  async createResource(lessonId: number, dto: CreateLessonResourceDto) {
    // validate lesson exists
    const lesson = await this.findOne(lessonId);

    if (dto.type === LessonResourceType.VIDEO) {
      if (!dto.media_asset_id) {
        throw new BadRequestException('media_asset_id is required for video');
      }
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
      position: dto.position,
    }as Partial<LessonResource>);

    const saved = await this.lessonResourceRepository.save(resource);
    return { resourceId: saved.id };
  }

  async update(id: number, updateLessonDto: UpdateLessonDto): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({ where: { id } });
    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    // patch-only updates
    if (updateLessonDto.title !== undefined) {
      lesson.title = updateLessonDto.title;
    }
    if (updateLessonDto.content_text !== undefined) {
      lesson.contentText = updateLessonDto.content_text;
    }
    if (updateLessonDto.media_asset_id !== undefined) {
      lesson.mediaAssetId = updateLessonDto.media_asset_id !== null && updateLessonDto.media_asset_id !== undefined
        ? Number(updateLessonDto.media_asset_id)
        : null;
    }
    if (updateLessonDto.pdf_media_asset_id !== undefined) {
      lesson.pdfMediaAssetId =
        updateLessonDto.pdf_media_asset_id !== null && updateLessonDto.pdf_media_asset_id !== undefined
          ? Number(updateLessonDto.pdf_media_asset_id)
          : null;
    }

    return this.lessonRepository.save(lesson);
  }

  async remove(id: number): Promise<void> {
    const lesson = await this.findOne(id);
    await this.lessonRepository.remove(lesson);
  }
}
