import { Type } from 'class-transformer';
import { IsString, IsOptional, IsInt, Min, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLessonDto {
  @ApiPropertyOptional({
    description: 'Title of the lesson',
    example: 'Introduction to NestJS',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Content text of the lesson',
    example: 'This is the content of the lesson.',
  })
  @IsOptional()
  @IsString()
  content_text?: string;

  @ApiPropertyOptional({
    description: 'Position of the lesson in the course',
    example: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({
    description: 'ID of the course this lesson belongs to',
    example: 5,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  courseId?: number;
}
