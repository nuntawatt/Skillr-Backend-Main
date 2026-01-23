import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LessonResponseDto {
  @ApiProperty({ description: 'Lesson ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Lesson title', example: 'Introduction to Variables' })
  title: string;

  @ApiPropertyOptional({ description: 'Lesson description' })
  description?: string;

  @ApiProperty({ description: 'Lesson type', example: 'article' })
  type: string;

  @ApiProperty({ description: 'Reference source', example: 'course' })
  refSource: string;

  @ApiProperty({ description: 'Reference ID', example: 1 })
  refId: number;

  @ApiProperty({ description: 'Order index within the chapter', example: 0 })
  orderIndex: number;

  @ApiProperty({ description: 'Chapter ID this lesson belongs to', example: 1 })
  chapterId: number;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;
}
