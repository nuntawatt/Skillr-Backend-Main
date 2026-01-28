import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleContentItem } from './create-article.dto';

export class ArticleResponseDto {
  @ApiProperty({ description: 'Article ID', example: 1 })
  article_id: number;

  @ApiProperty({ description: 'Lesson ID this article belongs to', example: 1 })
  lesson_id: number;

  @ApiProperty({
    description: 'Article content as array of { url, article } items',
    example: [{ url: 'https://cdn.example.com/image.png', article: 'Hello world' }],
  })
  article_content: ArticleContentItem[] | any;

  @ApiPropertyOptional({ description: 'Images extracted from article_content with their article id mapping' })
  images?: { url: string; article_id: number; index: number }[];

  @ApiPropertyOptional({ description: 'Has PDF article attached' })
  hasPdfArticle?: boolean;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}
