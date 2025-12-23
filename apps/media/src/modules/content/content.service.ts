import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Content } from './entities/content.entity';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
  ) {}

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
}
