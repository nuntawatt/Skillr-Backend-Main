import { ApiProperty } from '@nestjs/swagger';
import { ItemStatus, ItemType } from '../entities/item-progress.entity';

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
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'user-uuid' })
  userId: string;

  @ApiProperty({ example: 7 })
  lessonId: number;

  @ApiProperty({ example: '2026-01-14T10:05:00.000Z' })
  completedAt: Date;
}

export class ChapterProgressDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 1 })
  chapterId: number;

  @ApiProperty({ example: 5 })
  totalItems: number;

  @ApiProperty({ example: 3 })
  completedItems: number;

  @ApiProperty({ example: 60.00 })
  progressPercentage: number;

  @ApiProperty({ example: 7, required: false })
  lastCompletedItemId?: number;

  @ApiProperty({ example: 8, required: false })
  currentItemId?: number;

  @ApiProperty({ example: false })
  checkpointUnlocked: boolean;

  @ApiProperty({ example: '2026-01-14T10:05:00.000Z' })
  updatedAt: Date;
}

export class ItemProgressDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 7 })
  itemId: number;

  @ApiProperty({ example: 1 })
  chapterId: number;

  @ApiProperty({ enum: ItemStatus, example: ItemStatus.COMPLETED })
  status: ItemStatus;

  @ApiProperty({ enum: ItemType, example: ItemType.ARTICLE })
  itemType: ItemType;

  @ApiProperty({ example: 1 })
  orderIndex: number;

  @ApiProperty({ example: '2026-01-14T10:00:00.000Z', required: false })
  startedAt?: Date;

  @ApiProperty({ example: '2026-01-14T10:05:00.000Z', required: false })
  completedAt?: Date;

  @ApiProperty({ example: 300 })
  timeSpentSeconds: number;

  @ApiProperty({ example: false })
  quizSkipped: boolean;

  @ApiProperty({ example: '2026-01-14T10:05:00.000Z' })
  updatedAt: Date;
}

export class ChapterRoadmapDto {
  @ApiProperty({ type: ChapterProgressDto })
  chapterProgress: ChapterProgressDto;

  @ApiProperty({ type: [ItemProgressDto] })
  items: ItemProgressDto[];

  @ApiProperty({ example: 'Introduction to Programming' })
  chapterTitle: string;

  @ApiProperty({ example: 1 })
  chapterOrder: number;
}

export class CompleteItemRequestDto {
  @ApiProperty({ example: 7 })
  itemId: number;

  @ApiProperty({ example: 300, required: false })
  timeSpentSeconds?: number;

  @ApiProperty({ example: false, required: false })
  quizSkipped?: boolean;
}

