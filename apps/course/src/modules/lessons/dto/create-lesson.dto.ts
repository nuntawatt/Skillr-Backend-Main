import { Type } from 'class-transformer';
import { IsString, IsOptional, IsInt, Min, IsNumber } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  content_text?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  position?: number;

  // courseId is optional for now; default to 0 when not provided.
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  courseId?: number;
}
