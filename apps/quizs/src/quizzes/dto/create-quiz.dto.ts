import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { QuestionType } from '../entities/question.entity';

const MESSAGE_LIMIT_EXCEEDED = 'ข้อความเกินขีดจำกัดที่กำหนด';
const MAX_QUESTION_LENGTH = 500;
const MAX_OPTION_LENGTH = 150;

export class CreateQuestionDto {
  @ApiProperty({ example: '1 + 1 เท่ากับเท่าไหร่?' })
  @IsString()
  @MaxLength(MAX_QUESTION_LENGTH, { message: MESSAGE_LIMIT_EXCEEDED })
  question: string;

  @ApiProperty({ enum: QuestionType, example: QuestionType.MULTIPLE_CHOICE })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiPropertyOptional({ example: 'https://example.com/image.png' })
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional({ example: 'เพราะ 1 + 1 = 2' })
  @IsOptional()
  @IsString()
  correctExplanation?: string;

  // Multiple Choice options: 3-4 choices, each <= 150 chars
  @ApiPropertyOptional({ type: [String], example: ['1', '2', '3', '4'] })
  @ValidateIf((q) => q.type === QuestionType.MULTIPLE_CHOICE)
  @IsArray()
  @ArrayMinSize(3, { message: 'ต้องมีตัวเลือกอย่างน้อย 3 ตัวเลือก' })
  @ArrayMaxSize(4, { message: 'ตัวเลือกต้องไม่เกิน 4 ตัวเลือก' })
  @IsString({ each: true })
  @MaxLength(MAX_OPTION_LENGTH, {
    each: true,
    message: MESSAGE_LIMIT_EXCEEDED,
  })
  options?: string[];

  // correctAnswer validations per type
  @ApiPropertyOptional({ example: '2' })
  @ValidateIf((q) => q.type === QuestionType.MULTIPLE_CHOICE)
  @IsString()
  @MaxLength(MAX_OPTION_LENGTH, { message: MESSAGE_LIMIT_EXCEEDED })
  correctAnswer?: string;

  @ApiPropertyOptional({ example: true })
  @ValidateIf((q) => q.type === QuestionType.TRUE_FALSE)
  @IsBoolean()
  correctAnswerBool?: boolean;
}

export class CreateQuizDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Type(() => Number)
  lessonId: number;

  @ApiPropertyOptional({ example: 'แบบทดสอบพื้นฐาน TypeScript' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    type: [CreateQuestionDto],
    description: 'รายการคำถาม (สูงสุด 1 ข้อต่อ 1 บทเรียน)',
    example: [
      {
        question: 'ผลไม้ในข้อใดมีสีแดง?',
        type: 'multiple_choice',
        options: ['แอปเปิ้ล', 'กล้วย', 'องุ่นเขียว'],
        correctAnswer: 'แอปเปิ้ล',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions?: CreateQuestionDto[];
}
