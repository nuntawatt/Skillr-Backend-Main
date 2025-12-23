import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async create(createCourseDto: CreateCourseDto): Promise<Course> {
    const isPublished = (createCourseDto as any).is_published;

    const course = this.courseRepository.create({
      ownerUserId: Number((createCourseDto as any).ownerId),
      title: createCourseDto.title,
      shortDescription: (createCourseDto as any).short_description,
      description: createCourseDto.description,
      price: Number(createCourseDto.price ?? 0),
      isPublished: typeof isPublished === 'boolean' ? isPublished : false,
    });
    return this.courseRepository.save(course);
  }

  async findAll(isPublished?: string): Promise<Course[]> {
    const query = this.courseRepository.createQueryBuilder('course');

    if (typeof isPublished === 'string') {
      const normalized = isPublished.trim().toLowerCase();
      if (['true', 'false', '1', '0'].includes(normalized)) {
        const value = normalized === 'true' || normalized === '1';
        query.where('course.isPublished = :value', { value });
      }
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<Course> {
    const courseId = Number(id);
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }
    return course;
  }

  async findByOwner(ownerId: string): Promise<Course[]> {
    return this.courseRepository.find({
      where: { ownerUserId: Number(ownerId) },
    });
  }

  async update(id: string, updateCourseDto: UpdateCourseDto): Promise<Course> {
    const course = await this.findOne(id);
    Object.assign(course, updateCourseDto);
    return this.courseRepository.save(course);
  }

  async remove(id: string): Promise<void> {
    const course = await this.findOne(id);
    await this.courseRepository.remove(course);
  }
}
