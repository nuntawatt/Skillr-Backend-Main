import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, MaxLength, Min } from 'class-validator';

export class UpdateChapterDto {
    @ApiPropertyOptional({ description: 'Chapter title', example: 'Getting Started' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    chapter_title?: string;

    @ApiPropertyOptional({ description: 'Order index within the level', example: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    chapter_orderIndex?: number;
}
