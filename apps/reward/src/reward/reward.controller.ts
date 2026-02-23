import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { RewardService } from './reward.service';
import { UpdateRewardDto } from './dto/update-reward.dto';
@Controller('reward')
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  @Get()
  findAll() {
    return this.rewardService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rewardService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRewardDto: UpdateRewardDto) {
    return this.rewardService.update(+id, updateRewardDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rewardService.remove(+id);
  }
}
