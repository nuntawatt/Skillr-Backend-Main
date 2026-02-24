import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RewardService } from './reward.service';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { CurrentUserId, JwtAuthGuard, Roles, RolesGuard } from '@auth';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { UserRole } from '@common/enums';
@Controller('rewards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  @Get('getAllStudentRewards')
  @ApiOperation({ summary: 'ดึงข้อมูล reward ทั้งหมด' })
  @ApiResponse({ status: 200, description: 'List of rewards' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Rewards not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  GetAllReward() {
    return this.rewardService.getAllReward();
  }

  @Post(':reward_id/redeem')
  @ApiOperation({ summary: 'แลก reward โดยใช้แต้มของ user' })
  @ApiResponse({ status: 200, description: 'Reward redeemed successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Reward not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @ApiParam({
    name: 'reward_id',
    type: Number,
  })
  redeemReward(
    @CurrentUserId() userId: string,
    @Param('reward_id', ParseIntPipe) reward_id: number,
  ) {
    return this.rewardService.redeemReward(userId, reward_id);
  }

  @Get('getReedeem')
  @ApiOperation({ summary: 'ดึงข้อมูล reward ที่ user แลกไปแล้ว' })
  @ApiResponse({ status: 200, description: 'List of redeemed rewards' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Redemption not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  getReedeem(@CurrentUserId() userId: string) {
    return this.rewardService.getRedeem(userId);
  }

  @Get('userxp')
  @ApiOperation({ summary: 'ดึง XP ทั้งหมดของผู้ใช้' })
  @ApiResponse({ status: 200, description: 'Current user XP' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @ApiOperation({ summary: 'Get total XP for current user' })
  getTotalXp(@CurrentUserId() userId: string) {
    return this.rewardService.getUserTotalXp(userId);
  }

  
}
