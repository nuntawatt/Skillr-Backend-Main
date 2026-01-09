import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UploadImageDto {
  @ApiProperty({ description: 'Original filename', example: 'cat.jpg', required: false })
  @IsOptional()
  @IsString()
  originalFilename?: string;

  @ApiProperty({ description: 'Owner user id', example: 0, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ownerUserId?: number;
}
