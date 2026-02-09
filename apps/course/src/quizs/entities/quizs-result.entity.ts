import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum QuizsStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

@Entity('quizs_results')
@Index(['userId', 'lessonId'], { unique: true })
export class QuizsResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'text' })
  userId: string;

  @Column({ name: 'lesson_id' })
  lessonId: number;

  @Column({ name: 'user_answer', type: 'jsonb', nullable: true })
  userAnswer: any;

  @Column({ name: 'is_correct', type: 'boolean', nullable: true })
  isCorrect: boolean;

  @Column({
    type: 'enum',
    enum: QuizsStatus,
    default: QuizsStatus.PENDING,
  })
  status: QuizsStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
