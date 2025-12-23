import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType } from '../entities/question.entity';

export class CreateQuestionDto {
  @IsString()
  question: string;

  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsString()
  correctAnswer: string;

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
