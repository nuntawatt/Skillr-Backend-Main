import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ArticleContentItem } from './create-article.dto';

export class UpdateArticleDto {
    @ApiPropertyOptional({
        description: 'Article content as array of { url, article } items',
        example: [{ url: 'https://cdn.example.com/image.png', article: 'Updated caption' }],
    })
    
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ArticleContentItem)
    article_content?: ArticleContentItem[];
}

