import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CourseResponseDto {
  @ApiProperty()
  id: number;

  @ApiPropertyOptional()
  cover_media_asset_id?: number;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  media_assets_id?: number;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  level: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  tags: string[];

  @ApiProperty()
  ownerUserId: number;

  @ApiProperty()
  isPublished: boolean;

  @ApiProperty()
  durationSeconds: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
