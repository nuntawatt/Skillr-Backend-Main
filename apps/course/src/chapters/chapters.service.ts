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
      where: { level_id: createChapterDto.level_id },
    });

    if (!level) {
      throw new NotFoundException(
        `Level with ID ${createChapterDto.level_id} not found`,
      );
    }

    // Auto-generate orderIndex if not provided
    let orderIndex = createChapterDto.chapter_orderIndex;
    if (orderIndex === undefined) {
      const maxOrderResult = await this.chapterRepository
        .createQueryBuilder('chapter')
        .where('chapter.level_id = :levelId', { levelId: createChapterDto.level_id })
        .select('MAX(chapter.order_index)', 'maxOrder') // note: maps to column name; adjust if your column alias differs
        .getRawOne();

      // maxOrder may be a string depending on DB; coerce to number
      const maxOrder = maxOrderResult && maxOrderResult.maxOrder !== null
        ? Number(maxOrderResult.maxOrder)
        : -1;

      orderIndex = maxOrder + 1;
    }

    const chapter = this.chapterRepository.create({
      chapter_title: createChapterDto.chapter_title,
      chapter_name: createChapterDto.chapter_name,
      chapter_type: createChapterDto.chapter_type,
      chapter_description: createChapterDto.chapter_description,
      levelId: createChapterDto.level_id,
      chapter_orderIndex: orderIndex,
    });

    const saved = await this.chapterRepository.save(chapter);
    return this.toResponseDto(saved);
  }

  // Find all chapters for a level
  async findByLevel(levelId: number): Promise<ChapterResponseDto[]> {
    const chapters = await this.chapterRepository.find({
      where: { levelId },
      order: { chapter_orderIndex: 'ASC' },
    });

    return chapters.map((c) => this.toResponseDto(c));
  }

  // Find a chapter by ID
  async findOne(id: number): Promise<ChapterResponseDto> {
    const chapter = await this.chapterRepository.findOne({
      where: { chapter_id: id },
    });

    if (!chapter) {
      throw new NotFoundException(`Chapter with ID ${id} not found`);
    }

    return this.toResponseDto(chapter);
  }

  // Update a chapter by ID
  async update(
    id: number,
    updateChapterDto: UpdateChapterDto,
  ): Promise<ChapterResponseDto> {
    const chapter = await this.chapterRepository.findOne({
      where: { chapter_id: id },
    });

    if (!chapter) {
      throw new NotFoundException(`Chapter with ID ${id} not found`);
    }

    if (updateChapterDto.chapter_title !== undefined) {
      chapter.chapter_title = updateChapterDto.chapter_title;
    }

    if (updateChapterDto.chapter_name !== undefined) {
      chapter.chapter_name = updateChapterDto.chapter_name;
    }

    if (updateChapterDto.chapter_type !== undefined) {
      chapter.chapter_type = updateChapterDto.chapter_type;
    }

    if (updateChapterDto.chapter_description !== undefined) {
      chapter.chapter_description = updateChapterDto.chapter_description;
    }

    if (updateChapterDto.chapter_orderIndex !== undefined) {
      chapter.chapter_orderIndex = updateChapterDto.chapter_orderIndex;
    }

    const saved = await this.chapterRepository.save(chapter);
    return this.toResponseDto(saved);
  }

  // Delete a chapter by ID
  async remove(id: number): Promise<void> {
    const chapter = await this.chapterRepository.findOne({
      where: { chapter_id: id },
    });

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

    const chapterMap = new Map(chapters.map((c) => [c.chapter_id, c]));

    // Optionally: do this in a transaction to keep it atomic
    for (let i = 0; i < chapterIds.length; i++) {
      const chapter = chapterMap.get(chapterIds[i]);
      if (chapter) {
        chapter.chapter_orderIndex = i;
        await this.chapterRepository.save(chapter);
      }
    }

    return this.findByLevel(levelId);
  }

  // Convert Chapter entity to ChapterResponseDto
  private toResponseDto(chapter: Chapter): ChapterResponseDto {
    return {
      chapter_id: chapter.chapter_id,
      chapter_title: chapter.chapter_title,
      chapter_name: chapter.chapter_name,
      chapter_type: chapter.chapter_type,
      chapter_description: chapter.chapter_description,
      chapter_orderIndex: chapter.chapter_orderIndex,
      level_id: chapter.levelId,
    };
  }
}
