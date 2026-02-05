import { ApiProperty } from '@nestjs/swagger';

export class ChapterProgressDto {
  @ApiProperty()
  chapterId: number;

  @ApiProperty()
  totalItems: number;

  @ApiProperty()
  completedItems: number;

  @ApiProperty({ description: '0..100' })
  percent: number;

  @ApiProperty({ required: false, nullable: true })
  resumeLessonId?: number | null;
}
