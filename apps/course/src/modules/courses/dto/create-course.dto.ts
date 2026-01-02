import { Transform, Type } from 'class-transformer';
import { IsString, IsOptional, IsBoolean, IsNotEmpty, IsInt, IsIn, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

function transformOptionalNumber({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : value;
}
function transformOptionalBoolean({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
  }
  return value;
}

export class CreateCourseDto {
  @ApiPropertyOptional({
    description: 'Title of the course',
    example: 'Introduction to Programming',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Transform(transformOptionalNumber)
  price?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(transformOptionalBoolean)
  is_published?: boolean;

  @IsOptional()
  @IsInt()
  @Transform(transformOptionalNumber)
  categoryId?: number;

  @IsOptional()
  @IsIn(['beginner', 'intermediate', 'advanced'])
  level?: string;

  @IsOptional()
  @IsInt()
  @Transform(transformOptionalNumber)
  coverMediaId?: number;

  @IsOptional()
  @IsInt()
  @Transform(transformOptionalNumber)
  introMediaId?: number;
}
