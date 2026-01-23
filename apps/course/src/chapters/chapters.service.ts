import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chapter } from './entities/chapter.entity';
import { Level } from '../levels/entities/level.entity';
import { CreateChapterDto, UpdateChapterDto, ChapterResponseDto } from './dto';

@Injectable()
export class ChaptersService {
  constructor(
    @InjectRepository(Chapter)
    private readonly chapterRepository: Repository<Chapter>,
    @InjectRepository(Level)
    private readonly levelRepository: Repository<Level>,
  ) {}

  // Create a new chapter
  async create(createChapterDto: CreateChapterDto): Promise<ChapterResponseDto> {
    // Verify level exists
    const level = await this.levelRepository.findOne({
      where: { id: createChapterDto.levelId },
    });

    if (!level) {
      throw new NotFoundException(`Level with ID ${createChapterDto.levelId} not found`);
    }

    // Auto-generate orderIndex if not provided
    let orderIndex = createChapterDto.orderIndex;
    if (orderIndex === undefined) {
      const maxOrderResult = await this.chapterRepository
        .createQueryBuilder('chapter')
        .where('chapter.levelId = :levelId', { levelId: createChapterDto.levelId })
        .select('MAX(chapter.orderIndex)', 'maxOrder')
        .getRawOne();
      orderIndex = (maxOrderResult?.maxOrder ?? -1) + 1;
    }

    const chapter = this.chapterRepository.create({
      title: createChapterDto.title,
      levelId: createChapterDto.levelId,
      orderIndex,
    });

    const saved = await this.chapterRepository.save(chapter);
    return this.toResponseDto(saved);
  }

  // Find all chapters for a level
  async findByLevel(levelId: number): Promise<ChapterResponseDto[]> {
    const chapters = await this.chapterRepository.find({
      where: { levelId },
      order: { orderIndex: 'ASC' },
    });

    return chapters.map((c) => this.toResponseDto(c));
  }

  // Find a chapter by ID
  async findOne(id: number): Promise<ChapterResponseDto> {
    const chapter = await this.chapterRepository.findOne({ where: { id } });

    if (!chapter) {
      throw new NotFoundException(`Chapter with ID ${id} not found`);
    }

    return this.toResponseDto(chapter);
  }

  // Update a chapter by ID
  async update(id: number, updateChapterDto: UpdateChapterDto): Promise<ChapterResponseDto> {
    const chapter = await this.chapterRepository.findOne({ where: { id } });

    if (!chapter) {
      throw new NotFoundException(`Chapter with ID ${id} not found`);
    }

    if (updateChapterDto.title !== undefined) {
      chapter.title = updateChapterDto.title;
    }

    if (updateChapterDto.orderIndex !== undefined) {
      chapter.orderIndex = updateChapterDto.orderIndex;
    }

    const saved = await this.chapterRepository.save(chapter);
    return this.toResponseDto(saved);
  }

  // Delete a chapter by ID
  async remove(id: number): Promise<void> {
    const chapter = await this.chapterRepository.findOne({ where: { id } });

    if (!chapter) {
      throw new NotFoundException(`Chapter with ID ${id} not found`);
    }

    await this.chapterRepository.remove(chapter);
  }

  // Reorder chapters within a level
  async reorder(levelId: number, chapterIds: number[]): Promise<ChapterResponseDto[]> {
    const chapters = await this.chapterRepository.find({
      where: { levelId },
    });

    const chapterMap = new Map(chapters.map((c) => [c.id, c]));

    for (let i = 0; i < chapterIds.length; i++) {
      const chapter = chapterMap.get(chapterIds[i]);
      if (chapter) {
        chapter.orderIndex = i;
        await this.chapterRepository.save(chapter);
      }
    }

    return this.findByLevel(levelId);
  }

  // Convert Chapter entity to ChapterResponseDto
  private toResponseDto(chapter: Chapter): ChapterResponseDto {
    return {
      id: chapter.id,
      title: chapter.title,
      orderIndex: chapter.orderIndex,
      levelId: chapter.levelId,
    };
  }
}
