import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { QuizType } from './quizs.entity';

@Entity('quizs_checkpoint')
export class QuizsCheckpoint {
  @PrimaryGeneratedColumn({ name: 'checkpoint_id' })
  checkpointId: number;

  @Column({ name: 'checkpoint_type', type: 'enum', enum: QuizType, default: QuizType.MULTIPLE_CHOICE })
  checkpointType: QuizType;

  @Column({ name: 'checkpoint_questions', type: 'text' })
  checkpointQuestions: string;

  @Column({ name: 'checkpoint_option', type: 'jsonb', nullable: true })
  checkpointOption: string[];

  @Column({ name: 'checkpoint_answer', type: 'jsonb' })
  checkpointAnswer: any;

  @Column({ name: 'lesson_id' })
  lessonId: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
