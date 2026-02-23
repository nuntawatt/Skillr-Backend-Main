import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { RedemptionType } from '../../reward/entities/rewards.entity';

export class CreateRewardAdminDto {
  @ApiProperty({ example: 'Starbucks Voucher' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Get free coffee' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber()
  remain: number;

  @ApiProperty({ example: 'https://example.com/image.png' })
  @IsString()
  @IsNotEmpty()
  image_url: string;

  @ApiProperty({ example: 500 })
  @Type(() => Number)
  @IsNumber()
  required_points: number;

  @ApiProperty({ example: '2026-01-01T00:00:00Z' })
  @IsDateString()
  redeem_start_date: Date;

  @ApiProperty({ example: '2026-12-31T23:59:59Z' })
  @IsDateString()
  redeem_end_date: Date;

  @ApiProperty({ enum: RedemptionType })
  @IsEnum(RedemptionType)
  redemption_type: RedemptionType;

  @ApiProperty({ example: 30 })
  @Type(() => Number)
  @IsNumber()
  expire_after_days: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit_per_user?: number;

  @ApiProperty({ example: 1000 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  total_limit?: number;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  show_remaining_threshold?: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  is_active: boolean;
}
