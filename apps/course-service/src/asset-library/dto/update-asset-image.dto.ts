import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AssetImageStatus } from '../entities/asset-image.entity';

export class UpdateAssetImageDto {
    @ApiProperty({ example: 'original_filename.jpg', required: false })
    @IsOptional()
    @IsString()
    original_filename?: string;

    @ApiProperty({ example: 'https://example.com/image.jpg', required: false })
    @IsOptional()
    @IsString()
    public_url?: string;

    @ApiProperty({ example: AssetImageStatus.READY, enum: AssetImageStatus, required: false })
    @IsOptional()
    @IsEnum(AssetImageStatus)
    status?: AssetImageStatus;
}