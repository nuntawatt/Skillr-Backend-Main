import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateVideoPresignDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: 'string', description: 'Original filename (optional)' })
  original_filename?: string;

  @IsString()
  @ApiProperty({ type: 'string', description: 'MIME type of the video' })
  mime_type: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @ApiProperty({ type: 'number', description: 'Size in bytes' })
  size_bytes: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @ApiPropertyOptional({ type: 'number', description: 'Optional existing media asset id' })
  media_asset_id?: number;
}
