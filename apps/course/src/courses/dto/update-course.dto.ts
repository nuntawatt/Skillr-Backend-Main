import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, MaxLength, Min } from 'class-validator';

export class UpdateCourseDto {
  @ApiPropertyOptional({ description: 'Course title', example: 'Introduction to TypeScript' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'Course description', example: 'Learn TypeScript from scratch' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Cover image media asset ID', example: 123 })
  @IsOptional()
  @IsNumber()
  coverMediaAssetId?: number | null;

  @ApiPropertyOptional({ description: 'Intro video media asset ID', example: 456 })
  @IsOptional()
  @IsNumber()
  introMediaAssetId?: number | null;

  @ApiPropertyOptional({ description: 'Estimated time in seconds', example: 3600 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimateTimeSeconds?: number;

  @ApiPropertyOptional({ description: 'Is the course published', default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ description: 'Category ID', example: 5 })
  @IsOptional()
  @IsNumber()
  categoryId?: number | null;
}
