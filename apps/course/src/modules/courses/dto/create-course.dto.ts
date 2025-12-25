import { Transform, Type } from 'class-transformer';
import { IsString, IsOptional, IsBoolean, IsNotEmpty, IsInt, IsIn, } from 'class-validator';

function transformOptionalNumber({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : value;
}

function transformOptionalBoolean({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') return undefined;
  if (value === true || value === false) return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return value;
}

export class CreateCourseDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Transform(transformOptionalNumber)
  ownerId?: number;

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
