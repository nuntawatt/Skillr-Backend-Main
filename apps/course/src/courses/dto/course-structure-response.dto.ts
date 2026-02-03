import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LessonStructureDto {
  @ApiProperty({ description: 'Lesson ID', example: 1 })
  lesson_id: number;

  @ApiProperty({
    description: 'Lesson title',
    example: 'Introduction to Variables',
  })
  lesson_title: string;

  @ApiProperty({
    description: 'Lesson type',
    example: 'article',
    enum: ['article', 'video', 'quiz', 'assignment'],
  })
  lesson_type: string;

  // @ApiProperty({ description: 'Reference source', example: 'course', enum: ['course', 'media', 'quiz'] })
  // refSource: string;

  @ApiProperty({ description: 'Reference ID', example: 1 })
  ref_id: number;

  @ApiProperty({ description: 'Order index within chapter', example: 0 })
  orderIndex: number;
}

export class ChapterStructureDto {
  @ApiProperty({ description: 'Chapter ID', example: 1 })
  chapter_id: number;

  @ApiProperty({ description: 'Chapter title', example: 'Getting Started' })
  chapter_title: string;

  @ApiProperty({ description: 'Order index within level', example: 0 })
  orderIndex: number;

  @ApiProperty({
    description: 'Lessons in this chapter',
    type: [LessonStructureDto],
  })
  lessons: LessonStructureDto[];
}

export class LevelStructureDto {
  @ApiProperty({ description: 'Level ID', example: 1 })
  level_id: number;

  @ApiProperty({ description: 'Level title', example: 'Beginner' })
  level_title: string;

  @ApiProperty({ description: 'Order index within course', example: 0 })
  orderIndex: number;

  @ApiProperty({
    description: 'Chapters in this level',
    type: [ChapterStructureDto],
  })
  chapters: ChapterStructureDto[];
}

export class CourseStructureResponseDto {
  @ApiProperty({ description: 'Course ID', example: 1 })
  course_id: number;

  @ApiProperty({
    description: 'Course title',
    example: 'Introduction to TypeScript',
  })
  course_title: string;

  @ApiPropertyOptional({ description: 'Course description' })
  course_description?: string;

  @ApiPropertyOptional({ description: 'Course tags', type: [String] })
  course_tags?: string[];

  @ApiProperty({ description: 'Is the course published', example: false })
  isPublished: boolean;

  @ApiProperty({
    description: 'Levels in this course',
    type: [LevelStructureDto],
  })
  course_levels: LevelStructureDto[];
}
