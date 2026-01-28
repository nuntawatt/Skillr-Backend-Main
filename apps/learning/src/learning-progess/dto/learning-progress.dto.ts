import { ApiProperty } from '@nestjs/swagger';

export class ProgressSummaryDto {
  @ApiProperty({ example: 5 })
  totalCompleted: number;

  @ApiProperty({ example: 3 })
  streakDays: number;

  @ApiProperty({ example: '2026-01-14T10:05:00.000Z', required: false })
  lastCompletedAt?: Date;
}

export class QuizAttemptInsightDto {
  @ApiProperty({ example: 7 })
  quizId: number;

  @ApiProperty({ example: true })
  passed: boolean;

  @ApiProperty({ example: 100, required: false })
  score?: number;

  @ApiProperty({ example: '2026-01-14T10:02:00.000Z', required: false })
  completedAt?: Date;
}

export class QuizAttemptStatsDto {
  @ApiProperty({ example: 12 })
  totalAttempts: number;

  @ApiProperty({ example: 8 })
  passedAttempts: number;

  @ApiProperty({ type: QuizAttemptInsightDto, required: false })
  latestAttempt?: QuizAttemptInsightDto;
}

export class LearningDashboardDto {
  @ApiProperty({ type: ProgressSummaryDto })
  progress: ProgressSummaryDto;

  @ApiProperty({ type: QuizAttemptStatsDto })
  quizzes: QuizAttemptStatsDto;
}

export class LessonProgressResponseDto {
  @ApiProperty({ example: 5 })
  id: number;

  @ApiProperty({ example: 1 })
  userId: number;

  @ApiProperty({ example: 1 })
  lessonId: number;

  @ApiProperty({ example: '2026-01-14T10:05:00.000Z', required: false })
  completedAt?: Date;

  @ApiProperty({ example: 0 })
  lastReadCardIndex: number;
}

export class UpdateLessonProgressDto {
  @ApiProperty({ example: 1 })
  lastReadCardIndex: number;

  @ApiProperty({ example: false })
  isCompleted?: boolean;
}

export class RoadmapItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Introduction to Stocks' })
  title: string;

  @ApiProperty({ example: 'article' })
  type: string;

  @ApiProperty({ example: 'completed', enum: ['completed', 'current', 'locked'] })
  status: 'completed' | 'current' | 'locked';

  @ApiProperty({ example: 0 })
  orderIndex: number;

  @ApiProperty({ example: 'document', description: 'Icon type based on lesson type' })
  icon: string;
}

export class ChapterRoadmapDto {
  @ApiProperty({ example: 1 })
  chapterId: number;

  @ApiProperty({ example: 'Basics of Trading' })
  chapterTitle: string;

  @ApiProperty({ type: [RoadmapItemDto] })
  items: RoadmapItemDto[];
}
