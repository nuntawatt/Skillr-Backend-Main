import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateArticleDto {
    @ApiPropertyOptional({
        description: 'Article content as JSONB (editor blocks or structured content)',
        example: { blocks: [{ type: 'paragraph', data: { text: 'Updated content' } }] },
    })
    @IsOptional()
    content?: any;
}

