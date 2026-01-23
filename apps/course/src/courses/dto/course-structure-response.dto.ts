import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LessonStructureDto {
    @ApiProperty({ description: 'Lesson ID', example: 1 })
    id: number;

    @ApiProperty({ description: 'Lesson title', example: 'Introduction to Variables' })
    title: string;

    @ApiProperty({ description: 'Lesson type', example: 'article', enum: ['article', 'video', 'quiz', 'assignment'] })
    type: string;

    @ApiProperty({ description: 'Reference source', example: 'course', enum: ['course', 'media', 'quiz'] })
    refSource: string;

    @ApiProperty({ description: 'Reference ID', example: 1 })
    refId: number;

    @ApiProperty({ description: 'Order index within chapter', example: 0 })
    orderIndex: number;
}

export class ChapterStructureDto {
    @ApiProperty({ description: 'Chapter ID', example: 1 })
    id: number;

    @ApiProperty({ description: 'Chapter title', example: 'Getting Started' })
    title: string;

    @ApiProperty({ description: 'Order index within level', example: 0 })
    orderIndex: number;

    @ApiProperty({ description: 'Lessons in this chapter', type: [LessonStructureDto] })
    lessons: LessonStructureDto[];
}

export class LevelStructureDto {
    @ApiProperty({ description: 'Level ID', example: 1 })
    id: number;

    @ApiProperty({ description: 'Level title', example: 'Beginner' })
    title: string;

    @ApiProperty({ description: 'Order index within course', example: 0 })
    orderIndex: number;

    @ApiProperty({ description: 'Chapters in this level', type: [ChapterStructureDto] })
    chapters: ChapterStructureDto[];
}

export class CourseStructureResponseDto {
    @ApiProperty({ description: 'Course ID', example: 1 })
    id: number;

    @ApiProperty({ description: 'Course title', example: 'Introduction to TypeScript' })
    title: string;

    @ApiPropertyOptional({ description: 'Course description' })
    description?: string;

    @ApiProperty({ description: 'Is the course published', example: false })
    isPublished: boolean;

    @ApiProperty({ description: 'Levels in this course', type: [LevelStructureDto] })
    levels: LevelStructureDto[];
}
