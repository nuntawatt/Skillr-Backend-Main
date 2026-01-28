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
}
