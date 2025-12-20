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
    const course = this.courseRepository.create({
      ...createCourseDto,
      ownerId: Number((createCourseDto as any).ownerId),
    });
    return this.courseRepository.save(course);
  }

  async findAll(status?: string): Promise<Course[]> {
    const query = this.courseRepository.createQueryBuilder('course');
    
    if (status) {
      query.where('course.status = :status', { status });
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
      where: { ownerId: Number(ownerId) },
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
