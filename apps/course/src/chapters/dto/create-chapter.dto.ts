import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, MaxLength, Min } from 'class-validator';

export class CreateChapterDto {
    @ApiProperty({ description: 'Chapter title', example: 'Getting Started' })
    @IsString()
    @MaxLength(255)
    chapter_title: string;

    @ApiProperty({ description: 'Level ID this chapter belongs to', example: 1 })
    @IsNumber()
    @Min(1)
    level_id: number;

    @ApiPropertyOptional({ description: 'Order index within the level', example: 0, default: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    chapter_orderIndex?: number;
}
