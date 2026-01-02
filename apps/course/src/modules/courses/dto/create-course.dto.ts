import { Transform, Type } from 'class-transformer';
<<<<<<< Updated upstream
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  IsInt,
  IsIn,
} from 'class-validator';
=======
import { IsString, IsOptional, IsBoolean, IsNotEmpty, IsInt, IsIn, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
>>>>>>> Stashed changes

function transformOptionalNumber({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : value;
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

<<<<<<< Updated upstream
  @IsOptional()
  @IsInt()
  @Transform(transformOptionalNumber)
  ownerId?: number;

=======
>>>>>>> Stashed changes
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
