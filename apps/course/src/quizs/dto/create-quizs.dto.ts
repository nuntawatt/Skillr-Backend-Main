import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsArray, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { QuizType } from '../entities/quizs.entity';
import { toInt, toStringArray, toString } from './transformers';

export class CreateQuizsDto {
  @ApiProperty({ example: 1 })
  @Transform(toInt)
  @IsInt()
  lesson_id: number;

  @ApiProperty({ enum: QuizType, example: QuizType.MULTIPLE_CHOICE })
  @IsEnum(QuizType)
  quizs_type: QuizType;

  @ApiProperty({ example: 'TypeScript คืออะไร?' })
  @IsString()
  @IsNotEmpty()
  quizs_questions: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['Superset ของ JavaScript', 'ชื่อตัวละคร', 'ยี่ห้อกาแฟ'],
  })
  @ValidateIf((o) => o.quizs_type === QuizType.MULTIPLE_CHOICE)
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  quizs_option?: string[];

  // แปลงเป็น string เสมอ เพื่อ validation ชัดเจน
  @ApiProperty({ example: 'Superset ของ JavaScript' })
  @Transform(toString)
  @IsString()
  @IsNotEmpty()
  quizs_answer: string;

  @ApiPropertyOptional({ example: 'TypeScript เป็นภาษาที่สร้างครอบ JS เพื่อเพิ่มระบบ Type' })
  @IsOptional()
  @IsString()
  quizs_explanation?: string;
}