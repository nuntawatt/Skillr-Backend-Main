import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ArticleContentItem } from './create-article.dto';

export class UpdateArticleDto {

    @ApiPropertyOptional({
        description: 'Article content array',
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ArticleContentItem)
    article_content?: ArticleContentItem[];
}

