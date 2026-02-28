import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
    // อนุมัติ course มีอยู่จริง
    const course = await this.courseRepository.findOne({
      where: { course_id: createLevelDto.course_id },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${createLevelDto.course_id} not found`);
    }

    // สร้าง orderIndex อัตโนมัติถ้าไม่ได้ระบุ
    let orderIndex = createLevelDto.level_orderIndex;
    if (orderIndex === undefined) {
      const maxOrderResult = await this.levelRepository
        .createQueryBuilder('level')
        .where('level.course_id = :course_id', { course_id: createLevelDto.course_id })
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

  // Find a level by ID
  async findOne(id: number): Promise<LevelResponseDto> {
    const level = await this.levelRepository.findOne({ where: { level_id: id } });

    if (!level) {
      throw new NotFoundException(`Level with ID ${id} not found`);
    }

    return this.toResponseDto(level);
  }

  // Update a level
  async update(id: number, updateLevelDto: UpdateLevelDto): Promise<LevelResponseDto> {
    const level = await this.levelRepository.findOne({ where: { level_id: id } });

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
  async remove(id: number): Promise<{ message: string }> {
    const level = await this.levelRepository.findOne({ where: { level_id: id } });

    if (!level) {
      throw new NotFoundException(`Level with ID ${id} not found`);
    }

    await this.levelRepository.remove(level);
    return { message: `Level with ID ${id} deleted successfully` };
  }

  // Reorder levels within a course
  async reorder(courseId: number, levelIds: number[]): Promise<LevelResponseDto[]> {
    const levels = await this.levelRepository.find({
      where: { course_id: courseId },
    });

    if (levels.length === 0) {
      return [];
    }

    if (!Array.isArray(levelIds) || levelIds.length === 0) {
      throw new BadRequestException('level_ids is required');
    }

    if (levelIds.length !== levels.length) {
      throw new BadRequestException(
        `level_ids must include all levels in the course (expected ${levels.length}, got ${levelIds.length})`,
      );
    }

    const levelMap = new Map(levels.map((l) => [l.level_id, l]));

    for (const id of levelIds) {
      if (!levelMap.has(id)) {
        throw new BadRequestException(`Level ID ${id} does not belong to course ${courseId}`);
      }
    }

    const provided = new Set(levelIds);
    for (const level of levels) {
      if (!provided.has(level.level_id)) {
        throw new BadRequestException(
          `level_ids must include all levels in the course; missing ${level.level_id}`,
        );
      }
    }

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
