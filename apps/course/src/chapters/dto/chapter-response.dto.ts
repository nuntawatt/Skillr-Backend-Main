import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LessonResponseDto } from '../../lessons/dto/lesson-response.dto';

export class ChapterResponseDto {
    @ApiProperty({ description: 'Chapter ID', example: 1 })
    chapter_id: number;

    @ApiProperty({ description: 'Chapter title', example: 'Getting Started' })
    chapter_title: string;

    @ApiProperty({ description: 'Order index within level', example: 0 })
    chapter_orderIndex: number;

    @ApiProperty({ description: 'Level ID this chapter belongs to', example: 1 })
    level_id: number;

    @ApiPropertyOptional({ type: [LessonResponseDto], description: 'List of lessons in this chapter' })
    lessons?: LessonResponseDto[];
}
