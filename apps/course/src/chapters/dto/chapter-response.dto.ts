import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChapterResponseDto {
    @ApiProperty({ description: 'Chapter ID', example: 1 })
    chapter_id: number;

    @ApiProperty({ description: 'Chapter title', example: 'Getting Started' })
    chapter_title: string;

    @ApiProperty({ description: 'Chapter type', example: 'theory' })
    chapter_type: string;

    @ApiProperty({ description: 'Chapter name', example: 'getting-started' })
    chapter_name: string;

    @ApiPropertyOptional({ description: 'Chapter description', example: 'An introduction to the course.' })
    chapter_description?: string;

    @ApiProperty({ description: 'Order index within level', example: 0 })
    chapter_orderIndex: number;

    @ApiProperty({ description: 'Level ID this chapter belongs to', example: 1 })
    level_id: number;
}
