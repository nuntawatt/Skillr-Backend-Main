import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum QuizType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
}

@Entity('quizs')
export class Quizs {
  @PrimaryGeneratedColumn({ name: 'quizs_id' })
  quizsId: number;

  @Column({ name: 'quizs_type', type: 'enum', enum: QuizType, default: QuizType.MULTIPLE_CHOICE })
  quizsType: QuizType;

  @Column({ name: 'quizs_questions', type: 'text' })
  quizsQuestions: string;

  @Column({ name: 'quizs_option', type: 'jsonb', nullable: true })
  quizsOption: string[];

  @Column({ name: 'quizs_answer', type: 'jsonb' })
  quizsAnswer: any;

  @Column({ name: 'quizs_explanation', type: 'text', nullable: true })
  quizsExplanation: string;

  @Column({ name: 'lesson_id', unique: true })
  lessonId: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
