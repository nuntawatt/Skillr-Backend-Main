import { Type } from 'class-transformer';
import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// maximum PDF size: 51 MB
export const MAX_PDF_SIZE_BYTES = 51 * 1024 * 1024;

export class CreateLessonDto {
  @ApiPropertyOptional({
    description: 'Title of the lesson',
    example: 'Introduction to NestJS',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Content text of the lesson',
    example: 'This is the content of the lesson.',
  })
  @IsOptional()
  @IsString()
  content_text?: string;

  @ApiPropertyOptional({
    description: 'Media asset ID (e.g., uploaded video id) associated with the lesson',
    example: 42,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  media_asset_id?: number;

  @ApiPropertyOptional({
    description: 'PDF media asset ID (media service ID). We store only the id here.',
    example: 123,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pdf_media_asset_id?: number;
}
