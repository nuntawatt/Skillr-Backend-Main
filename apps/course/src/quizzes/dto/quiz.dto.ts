import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import { QuizType, QuizStatus } from '../entities/quiz.entity';

export interface QuizQuestion {
  id: string;
  question: string;
  type: QuizType;
  options?: string[];
  correct_answer: string | boolean;
  explanation?: string;
  order_index: number;
}

export class QuizQuestionDto {
  @ApiProperty({ description: 'Question text' })
  @IsString()
  question: string;

  @ApiProperty({ enum: QuizType, description: 'Question type' })
  @IsEnum(QuizType)
  type: QuizType;

  @ApiPropertyOptional({
    description: 'Answer options for multiple choice',
    type: [String],
    minItems: 2,
    maxItems: 6,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiProperty({ description: 'Correct answer' })
  correct_answer: string | boolean;

  @ApiPropertyOptional({ description: 'Explanation for immediate feedback' })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiProperty({ description: 'Question order index' })
  @IsInt()
  @Min(0)
  order_index: number;
}

export class QuizQuestionResultDto {
  @ApiProperty({ description: 'Question ID' })
  question_id: string;

  @ApiProperty({ description: 'Question text' })
  question: string;

  @ApiProperty({ description: 'User answer' })
  user_answer: string | boolean;

  @ApiProperty({ description: 'Correct answer' })
  correct_answer: string | boolean;

  @ApiProperty({ description: 'Is correct' })
  is_correct: boolean;

  @ApiPropertyOptional({ description: 'Explanation for feedback' })
  explanation?: string;
}

export class CreateQuizDto {
  @ApiProperty({ description: 'Quiz title' })
  @IsString()
  quiz_title: string;

  @ApiPropertyOptional({ description: 'Quiz description' })
  @IsOptional()
  @IsString()
  quiz_description?: string;

  @ApiProperty({ enum: QuizType, description: 'Type of quiz' })
  @IsEnum(QuizType)
  quiz_type: QuizType;

  @ApiPropertyOptional({ enum: QuizStatus, description: 'Quiz status' })
  @IsOptional()
  @IsEnum(QuizStatus)
  quiz_status?: QuizStatus;

  @ApiProperty({
    description: 'Array of quiz questions',
    type: [QuizQuestionDto],
    minItems: 1,
  })
  @IsArray()
  @IsString({ each: true })
  quiz_questions: QuizQuestionDto[];

  @ApiPropertyOptional({ description: 'Show immediate feedback to user' })
  @IsOptional()
  @IsBoolean()
  show_immediate_feedback?: boolean;

  @ApiPropertyOptional({ description: 'Allow user to retry quiz' })
  @IsOptional()
  @IsBoolean()
  allow_retry?: boolean;

  @ApiPropertyOptional({ description: 'Time limit in minutes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(300)
  time_limit?: number;

  @ApiPropertyOptional({ description: 'Passing score percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  passing_score?: number;

  @ApiProperty({ description: 'Lesson ID to associate quiz with' })
  @IsInt()
  @Min(1)
  lesson_id: number;
}

export class UpdateQuizDto {
  @ApiPropertyOptional({ description: 'Quiz title' })
  @IsOptional()
  @IsString()
  quiz_title?: string;

  @ApiPropertyOptional({ description: 'Quiz description' })
  @IsOptional()
  @IsString()
  quiz_description?: string;

  @ApiPropertyOptional({ enum: QuizType, description: 'Type of quiz' })
  @IsOptional()
  @IsEnum(QuizType)
  quiz_type?: QuizType;

  @ApiPropertyOptional({ enum: QuizStatus, description: 'Quiz status' })
  @IsOptional()
  @IsEnum(QuizStatus)
  quiz_status?: QuizStatus;

  @ApiPropertyOptional({
    description: 'Array of quiz questions',
    type: [QuizQuestionDto],
    minItems: 1,
  })
  @IsOptional()
  @IsArray()
  quiz_questions?: QuizQuestionDto[];

  @ApiPropertyOptional({ description: 'Show immediate feedback to user' })
  @IsOptional()
  @IsBoolean()
  show_immediate_feedback?: boolean;

  @ApiPropertyOptional({ description: 'Allow user to retry quiz' })
  @IsOptional()
  @IsBoolean()
  allow_retry?: boolean;

  @ApiPropertyOptional({ description: 'Time limit in minutes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(300)
  time_limit?: number;

  @ApiPropertyOptional({ description: 'Passing score percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  passing_score?: number;
}

export class QuizResponseDto {
  @ApiProperty({ description: 'Quiz ID' })
  quiz_id: number;

  @ApiProperty({ description: 'Quiz title' })
  quiz_title: string;

  @ApiPropertyOptional({ description: 'Quiz description' })
  quiz_description?: string;

  @ApiProperty({ enum: QuizType, description: 'Type of quiz' })
  quiz_type: QuizType;

  @ApiProperty({ enum: QuizStatus, description: 'Quiz status' })
  quiz_status: QuizStatus;

  @ApiProperty({
    description: 'Array of quiz questions',
    type: [QuizQuestionDto],
  })
  quiz_questions: QuizQuestionDto[];

  @ApiProperty({ description: 'Show immediate feedback to user' })
  show_immediate_feedback: boolean;

  @ApiProperty({ description: 'Allow user to retry quiz' })
  allow_retry: boolean;

  @ApiPropertyOptional({ description: 'Time limit in minutes' })
  time_limit?: number;

  @ApiProperty({ description: 'Passing score percentage' })
  passing_score: number;

  @ApiProperty({ description: 'Lesson ID' })
  lesson_id: number;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;
}

export class QuizAnswerDto {
  @ApiProperty({ description: 'Question ID' })
  @IsString()
  question_id: string;

  @ApiProperty({ description: 'User answer' })
  answer: string | boolean;
}

export class QuizSubmissionDto {
  @ApiProperty({ description: 'Array of answers', type: [QuizAnswerDto] })
  @IsArray()
  answers: QuizAnswerDto[];
}

export class QuizResultDto {
  @ApiProperty({ description: 'Total questions' })
  total_questions: number;

  @ApiProperty({ description: 'Correct answers' })
  correct_answers: number;

  @ApiProperty({ description: 'Score percentage' })
  score: number;

  @ApiProperty({ description: 'Passed quiz' })
  passed: boolean;

  @ApiProperty({
    description: 'Question results with feedback',
    type: [QuizQuestionResultDto],
  })
  question_results: QuizQuestionResultDto[];
}
