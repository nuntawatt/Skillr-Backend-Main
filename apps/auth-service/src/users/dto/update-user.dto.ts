import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ example: 'skllr' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'test' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg' })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({ example: '6f1d2c9e-...', required: false })
  @IsString()
  @IsOptional()
  avatar_media_id?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;
}
