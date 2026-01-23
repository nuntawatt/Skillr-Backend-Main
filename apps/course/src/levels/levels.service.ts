import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Level } from './entities/level.entity';
import { Course } from '../courses/entities/course.entity';
import { CreateLevelDto, UpdateLevelDto, LevelResponseDto } from './dto';

@Injectable()
export class LevelsService {
  constructor(
    @InjectRepository(Level)
    private readonly levelRepository: Repository<Level>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  // Create a new level
  async create(createLevelDto: CreateLevelDto): Promise<LevelResponseDto> {
    // Verify course exists
    const course = await this.courseRepository.findOne({
      where: { id: createLevelDto.courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${createLevelDto.courseId} not found`);
    }

    // Auto-generate orderIndex if not provided
    let orderIndex = createLevelDto.orderIndex;
    if (orderIndex === undefined) {
      const maxOrderResult = await this.levelRepository
        .createQueryBuilder('level')
        .where('level.courseId = :courseId', { courseId: createLevelDto.courseId })
        .select('MAX(level.orderIndex)', 'maxOrder')
        .getRawOne();
      orderIndex = (maxOrderResult?.maxOrder ?? -1) + 1;
    }

    const level = this.levelRepository.create({
      title: createLevelDto.title,
      courseId: createLevelDto.courseId,
      orderIndex,
    });

    const saved = await this.levelRepository.save(level);
    return this.toResponseDto(saved);
  }

  // Find all levels for a course
  async findByCourse(courseId: number): Promise<LevelResponseDto[]> {
    const levels = await this.levelRepository.find({
      where: { courseId },
      order: { orderIndex: 'ASC' },
    });

    return levels.map((l) => this.toResponseDto(l));
  }

  // Find a level by ID
  async findOne(id: number): Promise<LevelResponseDto> {
    const level = await this.levelRepository.findOne({ where: { id } });

    if (!level) {
      throw new NotFoundException(`Level with ID ${id} not found`);
    }

    return this.toResponseDto(level);
  }

  // Update a level
  async update(id: number, updateLevelDto: UpdateLevelDto): Promise<LevelResponseDto> {
    const level = await this.levelRepository.findOne({ where: { id } });

    if (!level) {
      throw new NotFoundException(`Level with ID ${id} not found`);
    }

    if (updateLevelDto.title !== undefined) {
      level.title = updateLevelDto.title;
    }

    if (updateLevelDto.orderIndex !== undefined) {
      level.orderIndex = updateLevelDto.orderIndex;
    }

    const saved = await this.levelRepository.save(level);
    return this.toResponseDto(saved);
  }

  // Delete a level
  async remove(id: number): Promise<void> {
    const level = await this.levelRepository.findOne({ where: { id } });

    if (!level) {
      throw new NotFoundException(`Level with ID ${id} not found`);
    }

    await this.levelRepository.remove(level);
  }

  // Reorder levels within a course
  async reorder(courseId: number, levelIds: number[]): Promise<LevelResponseDto[]> {
    const levels = await this.levelRepository.find({
      where: { courseId },
    });

    const levelMap = new Map(levels.map((l) => [l.id, l]));

    for (let i = 0; i < levelIds.length; i++) {
      const level = levelMap.get(levelIds[i]);
      if (level) {
        level.orderIndex = i;
        await this.levelRepository.save(level);
      }
    }

    return this.findByCourse(courseId);
  }

  // Convert Level entity to LevelResponseDto
  private toResponseDto(level: Level): LevelResponseDto {
    return {
      id: level.id,
      title: level.title,
      orderIndex: level.orderIndex,
      courseId: level.courseId,
    };
  }
}
