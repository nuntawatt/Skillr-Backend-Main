import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Question } from './question.entity';

@Entity('quiz_options')
export class QuizOption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'question_id' })
  questionId: number;

  @ManyToOne(() => Question, (question) => question.options, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @Column({ name: 'option_text', type: 'text' })
  optionText: string;

  @Column({ name: 'is_correct', default: false })
  isCorrect: boolean;
}
