import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ArticleCardResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Card content here' })
  content: string;

  @ApiPropertyOptional({ example: 'https://example.com/icon.png' })
  mediaUrl?: string;

  @ApiProperty({ example: 1 })
  sequenceOrder: number;
}

export class ArticleResponseDto {
  @ApiProperty({ description: 'Article ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Lesson ID this article belongs to', example: 1 })
  lessonId: number;

  @ApiProperty({
    description: 'Article content as JSONB (deprecated for card-based)',
    example: { blocks: [{ type: 'paragraph', data: { text: 'Hello world' } }] },
    required: false,
  })
  article_content: any;

  @ApiPropertyOptional({ type: [ArticleCardResponseDto] })
  cards?: ArticleCardResponseDto[];

  @ApiPropertyOptional({ description: 'Has PDF article attached' })
  hasPdfArticle?: boolean;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}
