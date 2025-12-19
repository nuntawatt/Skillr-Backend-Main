import { Type } from 'class-transformer';
import { IsString, IsOptional, IsNumber, IsEnum, Min, IsInt } from 'class-validator';
import { ContentType } from '../entities/content.entity';

export class CreateContentDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsEnum(ContentType)
  type?: ContentType;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;

  @IsInt()
  @Type(() => Number)
  lessonId: number;
}
