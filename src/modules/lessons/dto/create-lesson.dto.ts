import { IsString, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;

  @IsString()
  courseId: string;

  @IsOptional()
  @IsBoolean()
  isFree?: boolean;
}
