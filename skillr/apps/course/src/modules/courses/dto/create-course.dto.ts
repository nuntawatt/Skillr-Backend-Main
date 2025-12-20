import { IsString, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { CourseStatus } from '../entities/course.entity';

export class CreateCourseDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;
}
