import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { LessonResourceType } from '../entities/lesson-resource.entity';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLessonResourceDto {
  @ApiPropertyOptional({
    description: 'Type of the lesson resource',
    example: LessonResourceType.VIDEO,
    enum: LessonResourceType,
  })
  @IsEnum(LessonResourceType)
  type: LessonResourceType;

  @ApiPropertyOptional({
    description: 'Title of the lesson resource',
    example: 'Introduction Video',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'URL of the lesson resource',
    example: 'https://example.com/resource/video.mp4',
  })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({
    description: 'Filename of the lesson resource',
    example: 'video.mp4',
  })
  @IsOptional()
  @IsString()
  filename?: string;

  @ApiPropertyOptional({
    description: 'MIME type of the lesson resource',
    example: 'video/mp4',
  })
  @IsOptional()
  @IsString()
  mime_type?: string;

  @ApiPropertyOptional({
    description: 'Media asset ID associated with the lesson resource',
    example: 42,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  media_asset_id?: number;

  @ApiPropertyOptional({
    description: 'Additional metadata for the lesson resource',
    example: { duration: 120, resolution: '1080p' },
  })
  @IsOptional()
  meta?: unknown;

  @ApiPropertyOptional({
    description: 'Position of the lesson resource in the lesson',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  position?: number;
}
