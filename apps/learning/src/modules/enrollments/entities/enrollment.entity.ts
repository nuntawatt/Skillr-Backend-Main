import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

export enum EnrollmentStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('enrollments')
@Unique(['studentId', 'courseId'])
export class Enrollment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'student_id' })
  studentId: number;

  @Column({ name: 'course_id' })
  courseId: number;

  @Column({
    type: 'enum',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.PENDING,
  })
  status: EnrollmentStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  progress: number; // percentage

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
