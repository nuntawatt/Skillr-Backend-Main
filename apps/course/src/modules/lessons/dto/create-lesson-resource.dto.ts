import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { LessonResourceType } from '../entities/lesson-resource.entity';

export class CreateLessonResourceDto {
  @IsEnum(LessonResourceType)
  type: LessonResourceType;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  filename?: string;

  @IsOptional()
  @IsString()
  mime_type?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  media_asset_id?: number;

  @IsOptional()
  meta?: unknown;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  position?: number;
}
