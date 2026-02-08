import { ApiProperty } from '@nestjs/swagger';
import { LessonProgressStatus } from '../entities/progress.entity';

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
  progressPercent?: number;

  @ApiProperty({ required: false, nullable: true })
  positionSeconds?: number | null;

  @ApiProperty({ required: false, nullable: true })
  durationSeconds?: number | null;

  @ApiProperty({ required: false, nullable: true })
  completedAt?: Date | null;

  @ApiProperty()
  orderIndex: number;
}

export class ChapterRoadmapDto {
  @ApiProperty()
  chapterId: number;

  @ApiProperty()
  chapterTitle: string;

  @ApiProperty({ description: '0..100' })
  progressPercent: number;

  @ApiProperty({ type: [ItemStatusDto] })
  items: ItemStatusDto[];

  // เก็บสถานะของบทถัดไปที่ผู้ใช้สามารถเข้าเรียนได้
  @ApiProperty({ required: false, nullable: true })
  nextAvailableLessonId?: number | null;

  // เก็บ Boolean ว่าบทนี้มี Checkpoint หรือไม่
  @ApiProperty({ required: false, nullable: true })
  hasCheckpoint?: boolean;

  // เก็บสถานะของ Checkpoint ว่าถูกปลดล็อคหรือไม่
  @ApiProperty({ required: false, nullable: true })
  checkpointUnlocked?: boolean;
}