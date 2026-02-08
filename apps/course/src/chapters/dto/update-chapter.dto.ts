import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, MaxLength, Min, Max } from 'class-validator';

export class UpdateChapterDto {
    @IsString()
    @IsOptional()
    chapter_title?: string;

    @IsString()
    @IsOptional()
    chapter_name?: string;

    @IsString()
    @IsOptional()
    @MaxLength(255)
    chapter_description?: string;

    @ApiPropertyOptional({ description: 'Order index within the level', example: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    chapter_orderIndex?: number;
}
