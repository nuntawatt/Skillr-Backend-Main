import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Instructor } from './entities/instructor.entity';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { UpdateInstructorDto } from './dto/update-instructor.dto';

@Injectable()
export class InstructorsService {
  constructor(@InjectRepository(Instructor)
  private readonly instructorRepository: Repository<Instructor>) { }

  async create(createInstructorDto: CreateInstructorDto): Promise<Instructor> {
    const instructor = this.instructorRepository.create({
      ...createInstructorDto,
      userId: Number(createInstructorDto.userId),
    });
    return this.instructorRepository.save(instructor);
  }

  async findAll(): Promise<Instructor[]> {
    return this.instructorRepository.find({ relations: ['user'] });
  }

  async findOne(id: string): Promise<Instructor> {
    const instructorId = Number(id);
    const instructor = await this.instructorRepository.findOne({ where: { id: instructorId }, relations: ['user'] });

    if (!instructor) {
      throw new NotFoundException(`Instructor with ID ${id} not found`);
    }
    return instructor;
  }

  async findByUserId(userId: string): Promise<Instructor | null> {
    return this.instructorRepository.findOne({ where: { userId: Number(userId) }, relations: ['user'] });
  }

  async update(id: string, updateInstructorDto: UpdateInstructorDto): Promise<Instructor> {
    const instructor = await this.findOne(id);
    Object.assign(instructor, updateInstructorDto);
    return this.instructorRepository.save(instructor);
  }

  async remove(id: string): Promise<void> {
    const instructor = await this.findOne(id);
    await this.instructorRepository.remove(instructor);
  }
}
