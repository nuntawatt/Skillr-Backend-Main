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

  @IsOptional()
  @IsString()
  original_filename?: string;

  @IsString()
  mime_type: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  size_bytes: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  media_asset_id?: number;

  @ApiPropertyOptional({
    description: 'Owner user ID of the video',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  owner_user_id?: number;ผ
}
