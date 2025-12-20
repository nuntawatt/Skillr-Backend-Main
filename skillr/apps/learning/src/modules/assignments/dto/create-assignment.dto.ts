import { Type } from 'class-transformer';
import { IsString, IsOptional, IsNumber, IsBoolean, IsDateString, Min, IsInt } from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsInt()
  @Type(() => Number)
  courseId: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxScore?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
