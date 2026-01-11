import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Quiz } from './quiz.entity';

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  MATCH_PAIRS = 'match_pairs',
  CORRECT_ORDER = 'correct_order',
  SHORT_ANSWER = 'short_answer',
}

export interface MatchPairOption {
  left: string;
  right: string;
}

export interface CorrectOrderOption {
  text: string;
}

export type QuestionOptions =
  | string[]
  | MatchPairOption[]
  | CorrectOrderOption[];

export type QuestionAnswer =
  | string
  | number
  | boolean
  | string[]
  | number[]
  | MatchPairOption[]
  | CorrectOrderOption[];

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  question: string;

  @Column({
    type: 'enum',
    enum: QuestionType,
    default: QuestionType.MULTIPLE_CHOICE,
  })
  type: QuestionType;

  @Column({ type: 'jsonb', nullable: true })
  options: QuestionOptions; // Stores options per question type

  @Column({ name: 'correct_answer', type: 'jsonb' })
  correctAnswer: QuestionAnswer;

  @Column({ nullable: true })
  explanation: string;

  @Column({ default: 1 })
  points: number;

  @Column({ default: 0 })
  order: number;

  @Column({ name: 'quiz_id' })
  quizId: number;

  @ManyToOne(() => Quiz, (quiz) => quiz.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quiz_id' })
  quiz: Quiz;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
