import { PartialType } from '@nestjs/swagger';
import { CreateRewardAdminDto } from './create-reward-admin.dto';

export class UpdateAdminDto extends PartialType(CreateRewardAdminDto) {}
