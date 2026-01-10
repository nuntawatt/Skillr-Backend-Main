import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateVideoUploadDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Video file to upload',
  })
  file: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Original filename of the uploaded video',
    example: 'my_video.mp4',
  })
  @IsOptional()
  @IsString()
  original_filename?: string;

  @ApiProperty({
    description: 'MIME type of the uploaded video',
    example: 'video/mp4',
  })
  @IsString()
  mime_type: string;

  @ApiProperty({
    description: 'Size of the uploaded video in bytes',
    example: 1048576,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  size_bytes: number;

  @ApiPropertyOptional({
    description: 'Media asset ID (optional, to link with existing asset)',
    example: 123,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  media_asset_id?: number;

  @ApiPropertyOptional({
    description: 'Owner user ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  owner_user_id?: number;
}
