import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum, MaxLength, Min } from 'class-validator';
import { LessonType } from '../entities/lesson.entity';

export class CreateLessonDto {
  @ApiProperty({ description: 'Lesson title', example: 'Introduction to Variables' })
  @IsString()
  @MaxLength(255)
  lesson_title: string;

  @ApiPropertyOptional({ description: 'Lesson description', example: 'Learn about variable types' })
  @IsOptional()
  @IsString()
  lesson_description?: string;

  @ApiProperty({ description: 'Chapter ID this lesson belongs to', example: 1 })
  @IsNumber()
  @Min(1)
  chapter_id: number;

  @ApiProperty({
    description: 'Lesson type',
    enum: LessonType,
    example: LessonType.ARTICLE,
  })
  @IsEnum(LessonType)
  lesson_type: LessonType;

  @ApiProperty({ description: 'Reference ID pointing to the content', example: 1 })
  @IsNumber()
  @Min(1)
  ref_id: number;

  @ApiPropertyOptional({ description: 'Order index within the chapter', example: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({ description: 'Cover image ID from media service', example: 123 })
  @IsOptional()
  @IsNumber()
  lesson_coverImage_id?: number | null;

  @ApiPropertyOptional({ description: 'Main video ID from media service', example: 456 })
  @IsOptional()
  @IsNumber()
  lesson_video_id?: number | null;
}