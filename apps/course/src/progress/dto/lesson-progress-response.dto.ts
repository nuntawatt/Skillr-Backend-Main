import { ApiProperty } from '@nestjs/swagger';
import { LessonProgressStatus } from '../entities/lesson-progress.entity';

export class LessonProgressResponseDto {
  @ApiProperty()
  lessonId: number;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: LessonProgressStatus })
  status: LessonProgressStatus;

  @ApiProperty()
  progress_Percent: number;

  @ApiProperty({ required: false, nullable: true })
  position_Seconds?: number | null;

  @ApiProperty({ required: false, nullable: true })
  duration_Seconds?: number | null;

  @ApiProperty({ required: false, nullable: true, type: Object })
  checkpoint?: Record<string, unknown> | null;

  @ApiProperty({ required: false, nullable: true })
  lastViewedAt?: Date | null;

  @ApiProperty({ required: false, nullable: true })
  completedAt?: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
