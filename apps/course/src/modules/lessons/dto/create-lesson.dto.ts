import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

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

  @IsString()
  courseId: string;
}
