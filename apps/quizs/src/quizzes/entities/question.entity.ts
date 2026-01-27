import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Quiz } from './quiz.entity';
import { QuizOption } from './quiz-option.entity';

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  // Keep existing for backward compatibility if needed, but primary focus is on MC and TF
  MATCH_PAIRS = 'match_pairs',
  CORRECT_ORDER = 'correct_order',
  SHORT_ANSWER = 'short_answer',
}

// ... (MatchPairOption and other types remain same if needed) ...

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'question_text', type: 'text' })
  questionText: string;

  @Column({
    type: 'enum',
    enum: QuestionType,
    default: QuestionType.MULTIPLE_CHOICE,
  })
  type: QuestionType;

  @Column({ name: 'media_url', type: 'text', nullable: true })
  mediaUrl: string;

  @Column({ name: 'correct_explanation', type: 'text', nullable: true })
  correctExplanation: string;

  @Column({ name: 'order_index', default: 0 })
  orderIndex: number;

  @OneToMany(() => QuizOption, (option) => option.question, { cascade: true })
  options: QuizOption[];

  @Column({ name: 'correct_answer', type: 'jsonb', nullable: true })
  correctAnswer: any; // Keep for non-MC/TF types if they persist

  @Column({ default: 1 })
  points: number;

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
