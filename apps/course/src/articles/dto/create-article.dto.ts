import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, IsString } from 'class-validator';

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
  content?: any;

}
