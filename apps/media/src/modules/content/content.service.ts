import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Content } from './entities/content.entity';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';

import * as Minio from 'minio';
import { Readable } from 'stream';

@Injectable()
export class ContentService {
  private readonly minioClient: Minio.Client;

  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
  ) {
    const endpoint = process.env.S3_ENDPOINT ?? process.env.S3_URL!;
    const url = new URL(endpoint);

    this.minioClient = new Minio.Client({
      endPoint: url.hostname,
      port: Number(url.port || 9000),
      useSSL: url.protocol === 'https:',
      accessKey: process.env.S3_ACCESS_KEY_ID,
      secretKey: process.env.S3_SECRET_ACCESS_KEY,
    });
  }

  async create(createContentDto: CreateContentDto): Promise<Content> {
    const content = this.contentRepository.create({
      ...createContentDto,
      lessonId: Number(createContentDto.lessonId),
    });
    return this.contentRepository.save(content);
  }

  async findAll(lessonId?: string): Promise<Content[]> {
    const query = this.contentRepository
      .createQueryBuilder('content')
      .orderBy('content.order', 'ASC');

    if (lessonId) {
      query.where('content.lessonId = :lessonId', {
        lessonId: Number(lessonId),
      });
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<Content> {
    const contentId = Number(id);
    const content = await this.contentRepository.findOne({
      where: { id: contentId },
    });
    if (!content) {
      throw new NotFoundException(`Content with ID ${id} not found`);
    }
    return content;
  }

  async update(
    id: string,
    updateContentDto: UpdateContentDto,
  ): Promise<Content> {
    const content = await this.findOne(id);
    Object.assign(content, updateContentDto);
    return this.contentRepository.save(content);
  }

  async remove(id: string): Promise<void> {
    const content = await this.findOne(id);
    await this.contentRepository.remove(content);
  }

  async getObjectStream(
    bucket: string,
    key: string,
  ): Promise<Readable> {
    return this.minioClient.getObject(bucket, key);
  }

  async putObject(
    bucket: string,
    key: string,
    stream: Readable,
    size?: number,
    meta?: Record<string, string>,
  ) {
    return this.minioClient.putObject(
      bucket,
      key,
      stream,
      size,
      meta,
    );
  }
  async fPutObject(
    bucket: string,
    key: string,
    filePath: string,
    meta?: Record<string, string>,
  ) {
    return this.minioClient.fPutObject(
      bucket,
      key,
      filePath,
      meta,
    );
  }
}
