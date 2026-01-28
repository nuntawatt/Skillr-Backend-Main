import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum, MaxLength, Min } from 'class-validator';
import { LessonType, LessonRefSource } from '../entities/lesson.entity';

export class UpdateLessonDto {
  @ApiPropertyOptional({ description: 'Lesson title', example: 'Introduction to Variables' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'Lesson description', example: 'Learn about variable types' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Lesson type',
    enum: LessonType,
    example: LessonType.ARTICLE,
    enumName: 'LessonType',
  })
  @IsOptional()
  @IsEnum(LessonType)
  type?: LessonType;

  @ApiPropertyOptional({
    description: 'Reference source where content is stored',
    enum: LessonRefSource,
    example: LessonRefSource.COURSE,
  })
  @IsOptional()
  @IsEnum(LessonRefSource)
  refSource?: LessonRefSource;

  @ApiPropertyOptional({ description: 'Reference ID pointing to the content', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  refId?: number;

  @ApiPropertyOptional({ description: 'Order index within the chapter', example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orderIndex?: number;
}