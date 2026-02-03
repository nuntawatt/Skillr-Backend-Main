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
      where: { course_id: createLevelDto.course_id },
    });

    if (!course) {
      throw new NotFoundException(
        `Course with ID ${createLevelDto.course_id} not found`,
      );
    }

    // Auto-generate orderIndex if not provided
    let orderIndex = createLevelDto.level_orderIndex;
    if (orderIndex === undefined) {
      const maxOrderResult = await this.levelRepository
        .createQueryBuilder('level')
        .where('level.course_id = :course_id', {
          course_id: createLevelDto.course_id,
        })
        .select('MAX(level.level_orderIndex)', 'maxOrder')
        .getRawOne();
      orderIndex = (maxOrderResult?.maxOrder ?? -1) + 1;
    }

    const level = this.levelRepository.create({
      level_title: createLevelDto.level_title,
      course_id: createLevelDto.course_id,
      level_orderIndex: orderIndex,
    });

    const saved = await this.levelRepository.save(level);
    return this.toResponseDto(saved);
  }

  // Find all levels for a course
  async findByCourse(courseId: number): Promise<LevelResponseDto[]> {
    const levels = await this.levelRepository.find({
      where: { course_id: courseId },
      order: { level_orderIndex: 'ASC' },
    });

    return levels.map((l) => this.toResponseDto(l));
  }

  // Find all levels
  async findAll(): Promise<LevelResponseDto[]> {
    const levels = await this.levelRepository.find({
      order: { level_orderIndex: 'ASC' },
    });

    return levels.map((l) => this.toResponseDto(l));
  }

  // Find a level by ID
  async findOne(id: number): Promise<LevelResponseDto> {
    const level = await this.levelRepository.findOne({
      where: { level_id: id },
    });

    if (!level) {
      throw new NotFoundException(`Level with ID ${id} not found`);
    }

    return this.toResponseDto(level);
  }

  // Update a level
  async update(
    id: number,
    updateLevelDto: UpdateLevelDto,
  ): Promise<LevelResponseDto> {
    const level = await this.levelRepository.findOne({
      where: { level_id: id },
    });

    if (!level) {
      throw new NotFoundException(`Level with ID ${id} not found`);
    }

    if (updateLevelDto.level_title !== undefined) {
      level.level_title = updateLevelDto.level_title;
    }

    if (updateLevelDto.level_orderIndex !== undefined) {
      level.level_orderIndex = updateLevelDto.level_orderIndex;
    }

    const saved = await this.levelRepository.save(level);
    return this.toResponseDto(saved);
  }

  // Delete a level
  async remove(id: number): Promise<void> {
    const level = await this.levelRepository.findOne({
      where: { level_id: id },
    });

    if (!level) {
      throw new NotFoundException(`Level with ID ${id} not found`);
    }

    await this.levelRepository.remove(level);
  }

  // Reorder levels within a course
  async reorder(
    courseId: number,
    levelIds: number[],
  ): Promise<LevelResponseDto[]> {
    const levels = await this.levelRepository.find({
      where: { course_id: courseId },
    });

    const levelMap = new Map(levels.map((l) => [l.level_id, l]));

    for (let i = 0; i < levelIds.length; i++) {
      const level = levelMap.get(levelIds[i]);
      if (level) {
        level.level_orderIndex = i;
        await this.levelRepository.save(level);
      }
    }

    return this.findByCourse(courseId);
  }

  // Convert Level entity to LevelResponseDto
  private toResponseDto(level: Level): LevelResponseDto {
    return {
      level_id: level.level_id,
      level_title: level.level_title,
      level_orderIndex: level.level_orderIndex,
      course_id: level.course_id,
    };
  }
}
