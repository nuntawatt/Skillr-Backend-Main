import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment, EnrollmentStatus } from './entities/enrollment.entity';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
  ) {}

  async enroll(studentId: string, courseId: string): Promise<Enrollment> {
    // Check if already enrolled
    const existing = await this.enrollmentRepository.findOne({
      where: { studentId, courseId },
    });
    
    if (existing) {
      throw new ConflictException('Already enrolled in this course');
    }
    
    const enrollment = this.enrollmentRepository.create({
      studentId,
      courseId,
      status: EnrollmentStatus.ACTIVE,
    });
    
    return this.enrollmentRepository.save(enrollment);
  }

  async findByStudent(studentId: string): Promise<Enrollment[]> {
    return this.enrollmentRepository.find({
      where: { studentId },
      relations: ['course', 'course.instructor', 'course.instructor.user'],
    });
  }

  async findByCourse(courseId: string): Promise<Enrollment[]> {
    return this.enrollmentRepository.find({
      where: { courseId },
      relations: ['student', 'student.user'],
    });
  }

  async checkEnrollment(studentId: string, courseId: string): Promise<{ enrolled: boolean }> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { studentId, courseId, status: EnrollmentStatus.ACTIVE },
    });
    return { enrolled: !!enrollment };
  }

  async findAll(status?: string): Promise<Enrollment[]> {
    const query = this.enrollmentRepository.createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .leftJoinAndSelect('enrollment.course', 'course');
    
    if (status) {
      query.where('enrollment.status = :status', { status });
    }
    
    return query.getMany();
  }

  async updateProgress(enrollmentId: string, progress: number): Promise<Enrollment> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
    });
    
    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${enrollmentId} not found`);
    }
    
    enrollment.progress = progress;
    if (progress >= 100) {
      enrollment.status = EnrollmentStatus.COMPLETED;
      enrollment.completedAt = new Date();
    }
    
    return this.enrollmentRepository.save(enrollment);
  }
}
