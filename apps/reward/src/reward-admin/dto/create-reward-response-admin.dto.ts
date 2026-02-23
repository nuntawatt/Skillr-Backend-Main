import { ApiProperty } from "@nestjs/swagger";
import { RedemptionType } from "../../reward/entities/rewards.entity";

export class CreateRewardAdminResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  image_url: string;

  @ApiProperty()
  required_points: number;

  @ApiProperty()
  remain: number;

  @ApiProperty()
  redeem_start_date: Date;

  @ApiProperty()
  redeem_end_date: Date;

  @ApiProperty({ enum: RedemptionType })
  redemption_type: RedemptionType;

  @ApiProperty()
  expire_after_days: number;

  @ApiProperty()
  limit_per_user: number;

  @ApiProperty()
  total_limit: number;

  @ApiProperty()
  show_remaining_threshold: number;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty()
  created_at: Date;

  constructor(partial: Partial<CreateRewardAdminResponseDto>) {
    Object.assign(this, partial);
  }
}
