import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class LessonSaveDto {
  @ApiPropertyOptional({ description: 'Existing lesson ID (optional)' })
  @IsOptional()
  @IsInt()
  id?: number;

  @ApiProperty({ description: 'Lesson title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Lesson type', example: 'article' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: 'Reference source (optional)' })
  @IsOptional()
  @IsString()
  refSource?: string;

  @ApiPropertyOptional({ description: 'Reference id (optional)' })
  @IsOptional()
  @IsInt()
  ref_id?: number;

  @ApiProperty({ description: 'Order index within chapter' })
  @IsInt()
  orderIndex: number;
}

export class ChapterSaveDto {
  @ApiPropertyOptional({ description: 'Existing chapter ID (optional)' })
  @IsOptional()
  @IsInt()
  id?: number;

  @ApiProperty({ description: 'Chapter title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Order index within level' })
  @IsInt()
  orderIndex: number;

  @ApiProperty({
    description: 'Lessons in this chapter',
    type: [LessonSaveDto],
  })
  @IsArray()
  lessons: LessonSaveDto[];
}

export class LevelSaveDto {
  @ApiPropertyOptional({ description: 'Existing level ID (optional)' })
  @IsOptional()
  @IsInt()
  id?: number;

  @ApiProperty({ description: 'Level title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Order index within course' })
  @IsInt()
  orderIndex: number;

  @ApiProperty({
    description: 'Chapters in this level',
    type: [ChapterSaveDto],
  })
  @IsArray()
  chapters: ChapterSaveDto[];
}

export class CourseStructureSaveDto {
  @ApiProperty({ description: 'Course title' })
  @IsString()
  course_title: string;

  @ApiPropertyOptional({ description: 'Course description' })
  @IsOptional()
  @IsString()
  course_description?: string;

  @ApiPropertyOptional({ description: 'Course tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  course_tags?: string[];

  @ApiProperty({ description: 'Levels in the course', type: [LevelSaveDto] })
  @IsArray()
  levels: LevelSaveDto[];
}
