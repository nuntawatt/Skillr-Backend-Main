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
  progress_Percent: number;

  @ApiProperty({ required: false, nullable: true })
  position_Seconds?: number | null;

  @ApiProperty({ required: false, nullable: true })
  duration_Seconds?: number | null;

  @ApiProperty({ required: false, nullable: true })
  lastViewedAt?: Date | null;

  @ApiProperty({ required: false, nullable: true })
  completedAt?: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
