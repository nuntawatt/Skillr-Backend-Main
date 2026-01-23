import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CourseResponseDto {
  @ApiProperty({ description: 'Course ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Owner user ID', example: 1 })
  ownerUserId: number;

  @ApiProperty({ description: 'Course title', example: 'Introduction to TypeScript' })
  title: string;

  @ApiPropertyOptional({ description: 'Course description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Cover image media asset ID' })
  coverMediaAssetId?: number;

  @ApiPropertyOptional({ description: 'Intro video media asset ID' })
  introMediaAssetId?: number;

  @ApiProperty({ description: 'Estimated time in seconds', example: 3600 })
  estimateTimeSeconds: number;

  @ApiProperty({ description: 'Is the course published', example: false })
  isPublished: boolean;

  @ApiPropertyOptional({ description: 'Category ID' })
  categoryId?: number;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}
