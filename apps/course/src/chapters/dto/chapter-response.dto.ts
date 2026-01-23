import { ApiProperty } from '@nestjs/swagger';

export class ChapterResponseDto {
    @ApiProperty({ description: 'Chapter ID', example: 1 })
    id: number;

    @ApiProperty({ description: 'Chapter title', example: 'Getting Started' })
    title: string;

    @ApiProperty({ description: 'Order index within the level', example: 0 })
    orderIndex: number;

    @ApiProperty({ description: 'Level ID this chapter belongs to', example: 1 })
    levelId: number;
}
