import { ApiProperty } from '@nestjs/swagger';
import { LessonProgressStatus } from '../entities/lesson-progress.entity';

export class LessonProgressResponseDto {
  @ApiProperty()
  lessonId: number;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: LessonProgressStatus })
  status: LessonProgressStatus;

  @ApiProperty({ required: false, nullable: true, type: Number, description: 'Prerequisite/previous lesson id that this lesson is mapped/locked to' })
  mapLessonId?: number | null;

  @ApiProperty()
  progressPercent: number;

  @ApiProperty({ required: false, nullable: true, description: 'Arbitrary checkpoint JSON stored by the player (if any)' })
  checkpoint?: unknown | null;

  @ApiProperty({ required: false, nullable: true })
  positionSeconds?: number | null;

  @ApiProperty({ required: false, nullable: true })
  durationSeconds?: number | null;

  @ApiProperty({ required: false, nullable: true })
  lastViewedAt?: Date | null;

  @ApiProperty({ required: false, nullable: true })
  completedAt?: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
