import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  MaxLength,
  Min,
} from 'class-validator';
import { LessonType } from '../entities/lesson.entity';

export class UpdateLessonDto {
  @ApiPropertyOptional({
    description: 'Lesson title',
    example: 'Introduction to Variables',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  lesson_title?: string;

  @ApiPropertyOptional({
    description: 'Lesson description',
    example: 'Learn about variable types',
  })
  @IsOptional()
  @IsString()
  lesson_description?: string;

  @ApiPropertyOptional({
    description: 'Lesson type',
    enum: LessonType,
    example: LessonType.ARTICLE,
  })
  @IsOptional()
  @IsEnum(LessonType)
  lesson_type?: LessonType;

  @ApiPropertyOptional({
    description: 'Reference ID pointing to the content',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  ref_id?: number;

  @ApiPropertyOptional({
    description: 'Order index within the chapter',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({
    description: 'Cover image ID from media service',
    example: 123,
  })
  @IsOptional()
  @IsNumber()
  lesson_coverImage_id?: number | null;

  @ApiPropertyOptional({
    description: 'Main video ID from media service',
    example: 456,
  })
  @IsOptional()
  @IsNumber()
  lesson_video_id?: number | null;
}
