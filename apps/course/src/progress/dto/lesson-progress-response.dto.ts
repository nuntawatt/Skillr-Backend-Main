import { ApiProperty } from '@nestjs/swagger';
import { LessonProgressStatus } from '../entities/progress.entity';

export class LessonProgressResponseDto {
  @ApiProperty()
  lessonId: number;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Chapter that this lesson belongs to',
  })
  chapterId?: number | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Level that this lesson belongs to (via chapter)',
  })
  levelId?: number | null;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: LessonProgressStatus })
  status: LessonProgressStatus;

  @ApiProperty()
  progressPercent: number;

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
