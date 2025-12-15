import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment, EnrollmentStatus } from './entities/enrollment.entity';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
  ) { }

  async enroll(studentId: string, courseId: string): Promise<Enrollment> {
    const numericStudentId = Number(studentId);
    const numericCourseId = Number(courseId);

    // Check if enrolled
    const existing = await this.enrollmentRepository.findOne({
      where: { studentId: numericStudentId, courseId: numericCourseId },
    });

    if (existing) {
      throw new ConflictException('Already enrolled in this course');
    }

    // Create new enrollment studentId, courseId, status
    const enrollment = this.enrollmentRepository.create({
      studentId: numericStudentId,
      courseId: numericCourseId,
      status: EnrollmentStatus.ACTIVE,
    });

    return this.enrollmentRepository.save(enrollment);
  }

  async findByStudent(studentId: string): Promise<Enrollment[]> {
    const numericStudentId = Number(studentId);
    return this.enrollmentRepository.find({
      where: { studentId: numericStudentId },
      relations: ['course', 'course.instructor', 'course.instructor.user']
    });
  }

  async findByCourse(courseId: string): Promise<Enrollment[]> {
    const numericCourseId = Number(courseId);
    return this.enrollmentRepository.find({
      where: { courseId: numericCourseId },
      relations: ['student', 'student.user']
    });
  }

  async checkEnrollment(studentId: string, courseId: string): Promise<{ enrolled: boolean }> {
    const numericStudentId = Number(studentId);
    const numericCourseId = Number(courseId);
    const enrollment = await this.enrollmentRepository.findOne({
      where: { studentId: numericStudentId, courseId: numericCourseId, status: EnrollmentStatus.ACTIVE }
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
    const numericEnrollmentId = Number(enrollmentId);
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: numericEnrollmentId }
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
