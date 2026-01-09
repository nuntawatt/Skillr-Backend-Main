import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UploadImageDto {
  @ApiProperty({
    description: 'Owner user id',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ownerUserId?: number;

  @ApiProperty({
    description: 'Alt text for accessibility',
    example: 'A cat sitting on a sofa',
    required: false,
  })
  @IsOptional()
  @IsString()
  altText?: string;

  @ApiProperty({
    description: 'Caption of the image',
    example: 'My lovely cat',
    required: false,
  })
  @IsOptional()
  @IsString()
  caption?: string;
}
