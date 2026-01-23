import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, MaxLength, Min } from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({ description: 'Course title', example: 'Introduction to TypeScript' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: 'Course description', example: 'Learn TypeScript from scratch' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Owner user ID', example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ownerUserId?: number;

  @ApiPropertyOptional({ description: 'Cover image media asset ID', example: 123 })
  @IsOptional()
  @IsNumber()
  coverMediaAssetId?: number;

  @ApiPropertyOptional({ description: 'Intro video media asset ID', example: 456 })
  @IsOptional()
  @IsNumber()
  introMediaAssetId?: number;

  @ApiPropertyOptional({ description: 'Estimated time in seconds', example: 3600, default: 0 })
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
  categoryId?: number;
}
