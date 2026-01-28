import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateArticleCardDto {
  @ApiProperty({ 
    description: 'The text content displayed on the card',
    example: 'Welcome to the lesson! This is the first card.' 
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({ 
    description: 'Optional URL for image or media displayed on the card',
    example: 'https://skillr-media.s3.amazonaws.com/cards/intro.png' 
  })
  @IsString()
  @IsOptional()
  mediaUrl?: string;

  @ApiProperty({ 
    description: 'The display order of this card (0-based index)',
    example: 0 
  })
  @IsNumber()
  sequenceOrder: number;
}

export class CreateArticleDto {
  @ApiProperty({ 
    description: 'ID of the lesson this article belongs to. Must be of type ARTICLE.', 
    example: 1 
  })
  @IsNumber()
  @Min(1)
  lessonId: number;

  @ApiPropertyOptional({
    description: 'General article content as JSONB. Recommended to provide at least an empty object {} if using card-based learning.',
    example: { description: 'Introduction to Python programming' },
  })
  @IsOptional()
  article_content?: any;

  @ApiPropertyOptional({ 
    description: 'List of cards for this article. Cards will be displayed in sequence order.',
    type: [CreateArticleCardDto] 
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateArticleCardDto)
  cards?: CreateArticleCardDto[];
}

export class ArticleProgressUpdateDto {
  @ApiProperty({ 
    description: 'The index of the card the user has just finished reading (0-based). If it is the last card, the article will be marked as completed.',
    example: 2 
  })
  @IsNumber()
  @Min(0)
  current_card_index: number;
}
