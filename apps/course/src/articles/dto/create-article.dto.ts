import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateArticleCardDto {
  @ApiProperty({ example: 'Card content here' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ example: 'https://example.com/icon.png' })
  @IsString()
  @IsOptional()
  mediaUrl?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  sequenceOrder: number;
}

export class CreateArticleDto {
  @ApiProperty({ description: 'Lesson ID this article belongs to', example: 1 })
  @IsNumber()
  @Min(1)
  lessonId: number;

  @ApiPropertyOptional({
    description: 'Article content as JSONB (editor blocks or structured content)',
    example: { blocks: [{ type: 'paragraph', data: { text: 'Hello world' } }] },
  })
  @IsOptional()
  article_content?: any;

  @ApiPropertyOptional({ type: [CreateArticleCardDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateArticleCardDto)
  cards?: CreateArticleCardDto[];
}

export class ArticleProgressUpdateDto {
  @ApiProperty({ example: 1, description: 'Current card index (0-based)' })
  @IsNumber()
  @Min(0)
  current_card_index: number;
}
