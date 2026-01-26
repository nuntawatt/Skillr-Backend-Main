import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateChapterDto {
    @ApiProperty({ description: 'Title of the chapter', example: 'Introduction' })
    @IsString()
    @IsNotEmpty()
    chapter_title: string;

    @ApiProperty({ description: 'Name of the chapter', example: 'typescript' })
    @IsString()
    @IsNotEmpty()
    chapter_name: string;

    @ApiProperty({ description: 'Type of the chapter', example: 'video' })
    @IsString()
    @IsNotEmpty()
    chapter_type: string;

    @ApiPropertyOptional({ description: 'Description of the chapter', example: 'This chapter covers the basics of TypeScript.' })
    @IsString()
    @IsOptional()
    chapter_description?: string;

    @ApiProperty({ description: 'ID of the level this chapter belongs to', example: 1 })
    @IsInt()
    level_id: number;

    @ApiPropertyOptional({ description: 'Order index of the chapter within the level', example: 1 })
    @IsInt()
    @IsOptional()
    chapter_orderIndex?: number;
}
