import {IsEnum,IsInt,IsNotEmpty,IsOptional,IsString,IsArray,ValidateIf,} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { QuizType } from '../entities/quizs.entity';
import { toInt, toStringArray, toString } from './transformers';

export class CreateCheckpointDto {
  @ApiProperty({ example: 1 })
  @Transform(toInt)
  @IsInt()
  lesson_id: number;

  @ApiProperty({ enum: QuizType, example: QuizType.MULTIPLE_CHOICE })
  @IsEnum(QuizType)
  checkpoint_type: QuizType;

  @ApiProperty({ example: '1 + 1 = ?' })
  @IsString()
  @IsNotEmpty()
  checkpoint_questions: string;

  @ApiPropertyOptional({ type: [String], example: ['1', '2', '3'] })
  @ValidateIf((o) => o.checkpoint_type === QuizType.MULTIPLE_CHOICE)
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  checkpoint_option?: string[];

  @ApiProperty({ example: '2' })
  @Transform(toString)
  @IsString()
  @IsNotEmpty()
  checkpoint_answer: string;

  @ApiPropertyOptional({ example: 'คำอธิบาย/เฉลยของ checkpoint' })
  @IsOptional()
  @IsString()
  checkpoint_explanation?: string;
}