import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { Lesson } from './entities/lesson.entity';
import { CreateLessonDto, MAX_PDF_SIZE_BYTES } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { LessonResource, LessonResourceType } from './entities/lesson-resource.entity';
import { CreateLessonResourceDto } from './dto/create-lesson-resource.dto';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class LessonsService {
  private readonly logger = new Logger(LessonsService.name);

  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(LessonResource)
    private readonly lessonResourceRepository: Repository<LessonResource>,
    private readonly storageService: StorageService,
  ) { }

  async create(createLessonDto: CreateLessonDto, filePdf?: Express.Multer.File): Promise<Lesson> {
    let pdfKey: string | null = null;

    if (filePdf) {
      if (filePdf.mimetype !== 'application/pdf') {
        throw new BadRequestException('Only PDF files are allowed');
      }

      if (filePdf.size > MAX_PDF_SIZE_BYTES) {
        throw new BadRequestException(`PDF file size exceeds ${MAX_PDF_SIZE_BYTES / (1024 * 1024)}MB limit`);
      }

      // Upload PDF directly to MinIO
      pdfKey = await this.uploadPdfToStorage(filePdf);

    }

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
      pdfKey,
      position: nextPosition,
    });

    return this.lessonRepository.save(lesson);
  }

  private async uploadPdfToStorage(file: Express.Multer.File): Promise<string> {
    const bucket = this.storageService.bucket;
    const fileExt = path.extname(file.originalname);

    const fileName = `${randomUUID()}${fileExt}`;
    const objectKey = `lessons/pdf/${fileName}`;

    await this.storageService.putObject(bucket, objectKey, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });


    return fileName;
  }

  async createArticle(filePdf: Express.Multer.File): Promise<Lesson> {
    if (!filePdf) {
      throw new BadRequestException('PDF file is required');
    }
    const createLessonDto: CreateLessonDto = {
      title: filePdf.originalname,
    };
    return this.create(createLessonDto, filePdf);
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

  async getPresignedUrlForResource(key: string): Promise<{ presignedUrl: string }> {
    const bucket = this.storageService.bucket;
    const objectKey = `lessons/pdf/${key}`;

    const presignedUrl = await this.storageService.buildPublicUrl(bucket, objectKey);

    if (!presignedUrl) {
      throw new NotFoundException(`Resource with key ${key} not found`);
    }

    return { presignedUrl };
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
      // Note: media asset validation can be added here if needed
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

  async update(id: number, updateLessonDto: UpdateLessonDto, filePdf?: Express.Multer.File): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({ where: { id } });
    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    // Handle PDF upload if provided
    if (filePdf) {
      if (filePdf.mimetype !== 'application/pdf') {
        throw new BadRequestException('Only PDF files are allowed');
      }
      if (filePdf.size > MAX_PDF_SIZE_BYTES) {
        throw new BadRequestException(`PDF file size exceeds ${MAX_PDF_SIZE_BYTES / (1024 * 1024)}MB limit`);
      }

      // Upload PDF directly to MinIO
      lesson.pdfKey = await this.uploadPdfToStorage(filePdf);
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

    return this.lessonRepository.save(lesson);
  }

  async remove(id: number): Promise<void> {
    const lesson = await this.findOne(id);

    if (lesson.pdfKey) {
      try {
        const bucket = this.storageService.bucket;
        const objectKey = `lessons/pdf/${lesson.pdfKey}`;
        await this.storageService.removeObject(this.storageService.bucket, objectKey);
      } catch (e) {
        this.logger.warn(`Failed to delete PDF for lesson ID ${id}: ${String(e)}`);
      }
    }

    await this.lessonRepository.remove(lesson);
  }
}
