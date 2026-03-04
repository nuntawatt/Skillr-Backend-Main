import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { AssetVideoStatus } from '../entities/asset-video.entity';

export class UpdateAssetVideoDto {

  @ApiProperty({ example: 'lecture-1.mp4', required: false })
  @IsOptional()
  @IsString()
  original_filename?: string;

  @ApiProperty({ example: 'https://cdn.example.com/thumb.jpg', required: false })
  @IsOptional()
  @IsString()
  thumbnail_url?: string;

  @ApiProperty({ example: 300, description: 'Video duration in seconds', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  duration_seconds?: number;

  @ApiProperty({ example: AssetVideoStatus.READY, enum: AssetVideoStatus, required: false })
  @IsOptional()
  @IsEnum(AssetVideoStatus)
  status?: AssetVideoStatus;

}