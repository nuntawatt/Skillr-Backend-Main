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
import { Type } from 'class-transformer';
import { QuestionType } from '../entities/question.entity';

const MESSAGE_LIMIT_EXCEEDED = 'ข้อความเกินขีดจำกัดที่กำหนด';
const MAX_QUESTION_LENGTH = 500;
const MAX_OPTION_LENGTH = 150;

export class MatchPairDto {
  @IsString()
  @MaxLength(MAX_OPTION_LENGTH, { message: MESSAGE_LIMIT_EXCEEDED })
  left: string;

  @IsString()
  @MaxLength(MAX_OPTION_LENGTH, { message: MESSAGE_LIMIT_EXCEEDED })
  right: string;
}

export class CorrectOrderOptionDto {
  @IsString()
  @MaxLength(MAX_OPTION_LENGTH, { message: MESSAGE_LIMIT_EXCEEDED })
  text: string;
}

export class CreateQuestionDto {
  @IsString()
  @MaxLength(MAX_QUESTION_LENGTH, { message: MESSAGE_LIMIT_EXCEEDED })
  question: string;

  @IsEnum(QuestionType)
  type: QuestionType;

  // Multiple Choice options: 3-4 choices, each <= 150 chars
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
  @ValidateIf((q) => q.type === QuestionType.MATCH_PAIRS)
  @IsArray()
  @ArrayMinSize(3, { message: 'ต้องมีอย่างน้อย 3 คู่' })
  @ValidateNested({ each: true })
  @Type(() => MatchPairDto)
  optionsPairs?: MatchPairDto[];

  // Correct Order: at least 3 items, each <= 150 chars
  @ValidateIf((q) => q.type === QuestionType.CORRECT_ORDER)
  @IsArray()
  @ArrayMinSize(3, { message: 'ต้องมีอย่างน้อย 3 รายการ' })
  @ValidateNested({ each: true })
  @Type(() => CorrectOrderOptionDto)
  optionsOrder?: CorrectOrderOptionDto[];

  // correctAnswer validations per type
  @ValidateIf((q) => q.type === QuestionType.MULTIPLE_CHOICE)
  @IsString()
  @MaxLength(MAX_OPTION_LENGTH, { message: MESSAGE_LIMIT_EXCEEDED })
  correctAnswer?: string;

  @ValidateIf((q) => q.type === QuestionType.TRUE_FALSE)
  @IsBoolean()
  correctAnswerBool?: boolean;

  @ValidateIf((q) => q.type === QuestionType.MATCH_PAIRS)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MatchPairDto)
  correctAnswerPairs?: MatchPairDto[];

  @ValidateIf((q) => q.type === QuestionType.CORRECT_ORDER)
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  correctAnswerOrder?: number[];

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  points?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;
}

export class CreateQuizDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Type(() => Number)
  lessonId: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  timeLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  passingScore?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions?: CreateQuestionDto[];
}
