import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ArticleResponseDto {
  @ApiProperty({ description: 'Article ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Lesson ID this article belongs to', example: 1 })
  lessonId: number;

  @ApiProperty({
    description: 'Article content as JSONB',
    example: { blocks: [{ type: 'paragraph', data: { text: 'Hello world' } }] },
  })
  article_content: any;

  @ApiPropertyOptional({ description: 'Has PDF article attached' })
  hasPdfArticle?: boolean;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}
