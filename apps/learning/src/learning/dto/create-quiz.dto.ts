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

export class MatchPairDto {
  @ApiProperty({ example: 'แมว' })
  @IsString()
  @MaxLength(MAX_OPTION_LENGTH, { message: MESSAGE_LIMIT_EXCEEDED })
  left: string;

  @ApiProperty({ example: 'เมี๊ยว' })
  @IsString()
  @MaxLength(MAX_OPTION_LENGTH, { message: MESSAGE_LIMIT_EXCEEDED })
  right: string;
}

export class CorrectOrderOptionDto {
  @ApiProperty({ example: 'ตื่นนอน' })
  @IsString()
  @MaxLength(MAX_OPTION_LENGTH, { message: MESSAGE_LIMIT_EXCEEDED })
  text: string;
}

export class CreateQuestionDto {
  @ApiProperty({ example: '1 + 1 เท่ากับเท่าไหร่?' })
  @IsString()
  @MaxLength(MAX_QUESTION_LENGTH, { message: MESSAGE_LIMIT_EXCEEDED })
  question: string;

  @ApiProperty({ enum: QuestionType, example: QuestionType.MULTIPLE_CHOICE })
  @IsEnum(QuestionType)
  type: QuestionType;

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

  // Match Pairs: at least 3 pairs, each side <= 150 chars
  @ApiPropertyOptional({ type: [MatchPairDto] })
  @ValidateIf((q) => q.type === QuestionType.MATCH_PAIRS)
  @IsArray()
  @ArrayMinSize(2, { message: 'ต้องมีอย่างน้อย 2 คู่' })
  @ArrayMaxSize(4, { message: 'ต้องมีไม่เกิน 4 คู่' })
  @ValidateNested({ each: true })
  @Type(() => MatchPairDto)
  optionsPairs?: MatchPairDto[];

  // Correct Order: at least 3 items, each <= 150 chars
  @ApiPropertyOptional({ type: [CorrectOrderOptionDto] })
  @ValidateIf((q) => q.type === QuestionType.CORRECT_ORDER)
  @IsArray()
  @ArrayMinSize(3, { message: 'ต้องมีอย่างน้อย 3 รายการ' })
  @ArrayMaxSize(4, { message: 'ต้องมีไม่เกิน 4 รายการ' })
  @ValidateNested({ each: true })
  @Type(() => CorrectOrderOptionDto)
  optionsOrder?: CorrectOrderOptionDto[];

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

  @ApiPropertyOptional({
    type: [CreateQuestionDto],
    example: [
      {
        question: 'ผลไม้ในข้อใดมีสีแดง?',
        type: 'multiple_choice',
        options: ['แอปเปิ้ล', 'กล้วย', 'องุ่นเขียว'],
        correctAnswer: 'แอปเปิ้ล',
      },
      {
        question: 'จงจับคู่แม่สีให้ถูกต้อง',
        type: 'match_pairs',
        optionsPairs: [
          { left: 'ท้องฟ้า', right: 'สีน้ำเงิน' },
          { left: 'กล้วยหอม', right: 'สีเหลือง' },
        ],
      },
      {
        question: 'จงเรียงลำดับการล้างมือ',
        type: 'correct_order',
        optionsOrder: [
          { text: 'ชโลมสบู่' },
          { text: 'ถูมือให้สะอาด' },
          { text: 'ล้างด้วยน้ำเปล่า' },
        ],
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions?: CreateQuestionDto[];
}
