import { ApiProperty } from '@nestjs/swagger';
import { LessonProgressStatus } from '../entities/lesson-progress.entity';

export class ItemStatusDto {
  @ApiProperty()
  lessonId: number;

  @ApiProperty()
  lessonTitle: string;

  @ApiProperty()
  lessonType: string;

  @ApiProperty({ enum: LessonProgressStatus })
  status: LessonProgressStatus;

  @ApiProperty({ description: '0..100', required: false })
  progress_Percent?: number;

  @ApiProperty({ required: false, nullable: true })
  position_Seconds?: number | null;

  @ApiProperty({ required: false, nullable: true })
  duration_Seconds?: number | null;

  @ApiProperty({ required: false, nullable: true })
  completedAt?: Date | null;

  @ApiProperty()
  orderIndex: number;

  @ApiProperty({ required: false, nullable: true })
  checkpoint?: Record<string, unknown> | null;
}

export class ChapterRoadmapDto {
  @ApiProperty()
  chapterId: number;

  @ApiProperty()
  chapterTitle: string;

  @ApiProperty({ description: '0..100' })
  progress_Percent: number;

  @ApiProperty({ type: [ItemStatusDto] })
  items: ItemStatusDto[];

  @ApiProperty({ required: false, nullable: true })
  nextAvailableLessonId?: number | null;

  @ApiProperty({ required: false, nullable: true })
  hasCheckpoint?: boolean;

  @ApiProperty({ required: false, nullable: true })
  checkpointUnlocked?: boolean;
}
