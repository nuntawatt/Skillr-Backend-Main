import { ApiProperty } from '@nestjs/swagger';

export class WishlistResponseDto {
  @ApiProperty({ example: 1 })
  wishlistId: number;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  userId: string;

  @ApiProperty({ example: 1 })
  courseId: number;

  @ApiProperty({ example: '2025-01-15T10:30:00.000Z' })
  createdAt: string;
}
