import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateAssetVideoDto {
    @ApiProperty({ example: 'lecture-1.mp4', required: false })
    @IsOptional()
    @IsString()
    original_filename?: string;

    @ApiProperty({ example: 'video/mp4' })
    @IsString()
    mime_type: string;

    @ApiProperty({ example: 10485760, description: 'File size in bytes' })
    @IsInt()
    @Min(1)
    @Max(1_500_000_000)
    size_bytes: number;

    @ApiProperty({ example: 300, description: 'Video duration in seconds' })
    @IsOptional()
    @IsInt()
    @Min(1)
    duration_seconds?: number;

    @ApiProperty({ example: 'https://example.com/thumbnail.jpg', description: 'Thumbnail URL for the video', required: false })
    @IsOptional()
    @IsString()
    thumbnail_url?: string;
}
