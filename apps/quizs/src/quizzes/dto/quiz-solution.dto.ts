import { ApiProperty } from '@nestjs/swagger';
import { QuestionType } from '../entities/question.entity';

export class QuizSolutionItemDto {
  @ApiProperty({ example: 13 })
  questionId: number;

  @ApiProperty({ example: 'ข้อใดคือหน่วยประมวลผลกลาง?' })
  question: string;

  @ApiProperty({
    enum: QuestionType,
    example: QuestionType.MULTIPLE_CHOICE,
  })
  type: QuestionType;

  @ApiProperty({
    example: 'CPU',
    description: 'คำตอบที่ผู้เรียนเลือก (ชนิดตามประเภทคำถาม)',
    nullable: true,
  })
  userAnswer: any;

  @ApiProperty({ example: true })
  isCorrect: boolean;

  @ApiProperty({
    example: 'CPU',
    description: 'เฉลยที่ถูกต้อง (ชนิดตามประเภทคำถาม)',
  })
  correctAnswer: any;

  @ApiProperty({
    example: 'CPU ย่อมาจาก Central Processing Unit',
    description: 'คำอธิบายเฉลย (แสดงเมื่อผู้เรียนตอบผิด)',
    nullable: true,
  })
  explanation?: string;

  @ApiProperty({
    example: ['CPU', 'GPU', 'RAM'],
    description: 'รายการตัวเลือกทั้งหมดของข้อนี้',
    nullable: true,
  })
  options: any;
}

export class QuizSolutionResponseDto {
  @ApiProperty({ example: 21 })
  attemptId: number;

  @ApiProperty({ example: 7 })
  quizId: number;

  @ApiProperty({ example: 2 })
  correctCount: number;

  @ApiProperty({ example: 3 })
  totalQuestions: number;

  @ApiProperty({
    example: 66.67,
    description: 'คะแนนเป็นเปอร์เซ็นต์ (0-100)',
  })
  score: number;

  @ApiProperty({ example: true })
  passed: boolean;

  @ApiProperty({
    example: '2026-01-14T10:02:00.000Z',
    description: 'เวลาที่ส่งคำตอบสำเร็จ',
  })
  completedAt: string;

  @ApiProperty({ type: [QuizSolutionItemDto] })
  solutions: QuizSolutionItemDto[];
}
