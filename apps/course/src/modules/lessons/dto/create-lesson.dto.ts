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

  @Type(() => Number)
  @IsInt()
  @Min(1)
  courseId: number;
}
