import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  RelationId,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Lesson } from '../../lessons/entities/lesson.entity';

export enum QuizType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
}

export enum QuizStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('quizzes')
@Index('idx_quizzes_lesson_id', ['lesson_id'])
export class Quiz {
  @PrimaryGeneratedColumn()
  quiz_id: number;

  @Column({ type: 'varchar', length: 255 })
  quiz_title: string;

  @Column({ type: 'text', nullable: true })
  quiz_description?: string;

  @Column({
    type: 'enum',
    enum: QuizType,
    default: QuizType.MULTIPLE_CHOICE,
  })
  quiz_type: QuizType;

  @Column({
    type: 'enum',
    enum: QuizStatus,
    default: QuizStatus.ACTIVE,
  })
  quiz_status: QuizStatus;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  quiz_questions: QuizQuestion[];

  @Column({ name: 'show_immediate_feedback', type: 'boolean', default: true })
  show_immediate_feedback: boolean;

  @Column({ name: 'allow_retry', type: 'boolean', default: true })
  allow_retry: boolean;

  @Column({ name: 'time_limit', type: 'int', nullable: true })
  time_limit?: number; // in minutes

  @Column({ name: 'passing_score', type: 'int', default: 70 })
  passing_score: number; // percentage

  @ManyToOne(() => Lesson, (lesson) => lesson.lesson_quizzes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @RelationId((quiz: Quiz) => quiz.lesson)
  @Column({ name: 'lesson_id', type: 'int' })
  lesson_id: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: QuizType;
  options?: string[]; // for multiple choice
  correct_answer: string | boolean;
  explanation?: string; // for immediate feedback
  order_index: number;
}
