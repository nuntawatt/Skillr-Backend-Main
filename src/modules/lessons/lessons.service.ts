import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from './entities/lesson.entity';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
  ) {}

  async create(createLessonDto: CreateLessonDto): Promise<Lesson> {
    const lesson = this.lessonRepository.create({
      ...createLessonDto,
      courseId: Number(createLessonDto.courseId),
    });
    return this.lessonRepository.save(lesson);
  }

  async findAll(courseId?: string): Promise<Lesson[]> {
    const query = this.lessonRepository.createQueryBuilder('lesson')
      .leftJoinAndSelect('lesson.course', 'course')
      .orderBy('lesson.order', 'ASC');
    
    if (courseId) {
      query.where('lesson.courseId = :courseId', { courseId: Number(courseId) });
    }
    
    return query.getMany();
  }

  async findOne(id: string): Promise<Lesson> {
    const lessonId = Number(id);
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: ['course']
    });
    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }
    return lesson;
  }

  async update(id: string, updateLessonDto: UpdateLessonDto): Promise<Lesson> {
    const lesson = await this.findOne(id);
    Object.assign(lesson, updateLessonDto);
    return this.lessonRepository.save(lesson);
  }

  async remove(id: string): Promise<void> {
    const lesson = await this.findOne(id);
    await this.lessonRepository.remove(lesson);
  }
}
