import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVideoUploadDto {

  @ApiPropertyOptional({
    description: 'Original filename of the uploaded video',
    example: 'intro.mp4'
  })
  @IsOptional()
  @IsString()
  original_filename?: string;

  @ApiProperty({
    description: 'MIME type of the uploaded video',
    example: 'video/mp4'
  })
  @IsString()
  mime_type: string;

  @ApiProperty({
    description: 'Size of the uploaded video in bytes',
    example: 1048576,
    minimum: 1
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  size_bytes: number;
}
