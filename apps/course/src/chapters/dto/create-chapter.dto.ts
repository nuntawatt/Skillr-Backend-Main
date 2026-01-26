import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateChapterDto {
    @ApiProperty({ description: 'Title of the chapter' })
    @IsString()
    @IsNotEmpty()
    chapter_title: string;

    @ApiProperty({ description: 'Name of the chapter' })
    @IsString()
    @IsNotEmpty()
    chapter_name: string;

    @ApiProperty({ description: 'Type of the chapter' })
    @IsString()
    @IsNotEmpty()
    chapter_type: string;

    @ApiPropertyOptional({ description: 'Description of the chapter' })
    @IsString()
    @IsOptional()
    chapter_description?: string;

    @ApiProperty({ description: 'ID of the level this chapter belongs to' })
    @IsInt()
    level_id: number;

    @ApiPropertyOptional({ description: 'Order index of the chapter within the level' })
    @IsInt()
    @IsOptional()
    chapter_orderIndex?: number;
}
