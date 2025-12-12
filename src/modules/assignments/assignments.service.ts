import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assignment } from './entities/assignment.entity';
import { AssignmentSubmission } from './entities/assignment-submission.entity';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(AssignmentSubmission)
    private readonly submissionRepository: Repository<AssignmentSubmission>,
  ) {}

  async create(createAssignmentDto: CreateAssignmentDto): Promise<Assignment> {
    const assignment = this.assignmentRepository.create(createAssignmentDto);
    return this.assignmentRepository.save(assignment);
  }

  async findAll(courseId?: string): Promise<Assignment[]> {
    const query = this.assignmentRepository.createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.course', 'course');
    
    if (courseId) {
      query.where('assignment.courseId = :courseId', { courseId });
    }
    
    return query.getMany();
  }

  async findOne(id: string): Promise<Assignment> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
      relations: ['course'],
    });
    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${id} not found`);
    }
    return assignment;
  }

  async update(id: string, updateAssignmentDto: UpdateAssignmentDto): Promise<Assignment> {
    const assignment = await this.findOne(id);
    Object.assign(assignment, updateAssignmentDto);
    return this.assignmentRepository.save(assignment);
  }

  async remove(id: string): Promise<void> {
    const assignment = await this.findOne(id);
    await this.assignmentRepository.remove(assignment);
  }

  async submit(assignmentId: string, studentId: string, submitDto: SubmitAssignmentDto): Promise<AssignmentSubmission> {
    const assignment = await this.findOne(assignmentId);
    
    const submission = this.submissionRepository.create({
      assignmentId: assignment.id,
      studentId,
      content: submitDto.content,
      fileUrl: submitDto.fileUrl,
    });
    
    return this.submissionRepository.save(submission);
  }

  async getSubmissions(assignmentId: string): Promise<AssignmentSubmission[]> {
    return this.submissionRepository.find({
      where: { assignmentId },
      relations: ['student', 'student.user'],
    });
  }

  async gradeSubmission(submissionId: string, gradeDto: GradeSubmissionDto): Promise<AssignmentSubmission> {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
    });
    
    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }
    
    submission.score = gradeDto.score;
    if (gradeDto.feedback) {
      submission.feedback = gradeDto.feedback;
    }
    submission.gradedAt = new Date();
    
    return this.submissionRepository.save(submission);
  }
}
