import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNotEmpty, IsInt, IsIn, IsArray, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';

function transformOptionalNumber({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : value;
}

export function transformOptionalBoolean({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
  const lower = value.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  }
  return value;
}

function transformTags({ value, obj }: { value: unknown; obj: any }) {
  const v = obj?.course_tags ?? obj?.tags ?? value;
  if (v == null) return undefined;
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Ignore JSON parse errors
    }
    return v.split(',').map((s) => String(s).trim()).filter(Boolean);
  }
  return v as unknown as string[];
}

export class CreateCourseDto {
  @ApiProperty({
    title: 'Title of the course',
    example: 'Introduction to Programming'
  })
  @IsNotEmpty()
  @IsString()
  course_name: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the course',
    example: 'This course covers the basics of programming using Python.',
  })
  @IsOptional()
  @IsString()
  course_detail?: string;

  @ApiPropertyOptional({
    description: 'Level of the course',
    example: 'beginner',
    enum: ['beginner', 'intermediate', 'advanced']
  })
  @IsOptional()
  @IsIn(['beginner', 'intermediate', 'advanced'])
  course_level?: 'beginner' | 'intermediate' | 'advanced';

  @ApiPropertyOptional({
    description: 'Price of the course',
    example: 49.99,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'price must be a valid number' })
  @Min(0)
  @Transform(transformOptionalNumber)
  course_price?: number;

  @ApiPropertyOptional({
    description: 'ID of the cover media asset',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Transform(transformOptionalNumber)
  course_cover_id?: number;

  @ApiPropertyOptional({
    description: 'Whether the course is published',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(transformOptionalBoolean)
  is_published?: boolean;

  @ApiPropertyOptional({
    description: 'Category ID of the course',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  @Transform(transformOptionalNumber)
  categoryId?: number;

  @ApiPropertyOptional({
    description: 'ID of the intro media asset',
    example: 10,
  })
  @IsOptional()
  @IsInt()
  @Transform(transformOptionalNumber)
  course_coverMediaId?: number;

  @ApiPropertyOptional({
    description: 'ID of the intro video media asset',
    example: 12,
  })
  @IsOptional()
  @IsInt()
  @Transform(transformOptionalNumber)
  course_introMediaId?: number;

  @ApiPropertyOptional({
    description: 'Tags associated with the course',
    example: ['programming', 'python', 'basics'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(transformTags)
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Owner user id of the course',
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Transform(transformOptionalNumber)
  ownerId?: number;
}
