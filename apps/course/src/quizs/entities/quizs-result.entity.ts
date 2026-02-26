import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum QuizsResultType {
  QUIZ = 'QUIZ',
  CHECKPOINT = 'CHECKPOINT',
}

export enum QuizsStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

@Entity('quizs_results')
@Index(['userId', 'lessonId'])
@Index(['userId', 'type', 'checkpointId'])
export class QuizsResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'text' })
  userId: string;

  @Column({
    name: 'type',
    type: 'enum',
    enum: QuizsResultType,
    default: QuizsResultType.QUIZ,
  })
  type: QuizsResultType;

  @Column({ name: 'lesson_id', type: 'integer' })
  lessonId: number;

  // ใช้เมื่อ type = CHECKPOINT
  @Column({ name: 'checkpoint_id', type: 'integer', nullable: true })
  checkpointId: number | null;

  @Column({ name: 'user_answer', type: 'jsonb', nullable: true })
  userAnswer: any;

  @Column({ name: 'is_correct', type: 'boolean', nullable: true })
  isCorrect: boolean | null;

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
