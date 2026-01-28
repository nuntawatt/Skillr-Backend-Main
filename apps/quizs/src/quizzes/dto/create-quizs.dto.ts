import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuizType } from '../entities/quizs.entity';

export class CreateQuizsDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  lesson_id: number;

  @ApiProperty({ enum: QuizType, example: QuizType.MULTIPLE_CHOICE })
  @IsEnum(QuizType)
  quizs_type: QuizType;

  @ApiProperty({ example: 'TypeScript คืออะไร?' })
  @IsString()
  @IsNotEmpty()
  quizs_questions: string;

  @ApiPropertyOptional({ type: [String], example: ['Superset ของ JavaScript', 'ชื่อตัวละคร', 'ยี่ห้อกาแฟ'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  quizs_option?: string[];

  @ApiProperty({ example: 'Superset ของ JavaScript' })
  @IsNotEmpty()
  quizs_answer: any;
}

export class CreateCheckpointDto {
  @ApiProperty({ example: 1 })
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
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  checkpoint_option?: string[];

  @ApiProperty({ example: '2' })
  @IsNotEmpty()
  checkpoint_answer: any;
}
