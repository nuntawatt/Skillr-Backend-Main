import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ArticleContentItem {
  @ApiPropertyOptional({ description: 'ID of the image from media-service', example: 123 })
  @IsNumber()
  id: number | null;

  @ApiPropertyOptional({ description: 'Article text associated with the URL', example: 'Image caption or paragraph text' })
  @IsString()
  article: string;

  @ApiPropertyOptional({ description: 'Order index of this content item', example: 1 })
  @IsNumber()
  order: number;
}

export class CreateArticleDto {
  @ApiProperty({ description: 'Lesson ID this article belongs to', example: 1 })
  @IsNumber()
  @Min(1)
  lesson_id: number;

  @ApiPropertyOptional({
    description: 'Article content as array of { url, article } items',
    example: [{ url: 'https://cdn.example.com/image.png', article: 'Caption or text' }],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArticleContentItem)
  article_content?: ArticleContentItem[];
}
