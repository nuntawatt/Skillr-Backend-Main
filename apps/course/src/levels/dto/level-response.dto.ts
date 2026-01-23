import { ApiProperty } from '@nestjs/swagger';

export class LevelResponseDto {
  @ApiProperty({ description: 'Level ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Level title', example: 'Beginner Level' })
  title: string;

  @ApiProperty({ description: 'Order index within the course', example: 0 })
  orderIndex: number;

  @ApiProperty({ description: 'Course ID this level belongs to', example: 1 })
  courseId: number;
}
