import { IsString, IsOptional, IsBoolean, IsNotEmpty, IsInt, IsIn, } from 'class-validator';

export class CreateCourseDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  ownerId?: number;

  @IsOptional()
  @IsInt()
  price?: number;

  @IsOptional()
  @IsBoolean()
  is_published?: boolean;

  @IsOptional()
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsIn(['beginner', 'intermediate', 'advanced'])
  level?: string;

  @IsOptional()
  @IsInt()
  coverMediaId?: number;

  @IsOptional()
  @IsInt()
  introMediaId?: number;
}
