import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { RewardService } from './reward.service';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUserId, JwtAuthGuard, Roles, RolesGuard } from '@auth';
import { ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { UserRole } from '@common/enums';

@Controller('rewards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard , RolesGuard)
@Roles(UserRole.STUDENT)
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  
  @Get('getAllRewards')
  GetAllReward() {
    return this.rewardService.getAllReward();
  }

  @Post(':reward_id/redeem')
  @ApiOperation({ summary: 'แลก reward โดยใช้แต้มของ user' })
  @ApiParam({
      name: 'reward_id',
      type: Number,
    })
  redeemReward(@CurrentUserId() userId: string ,  @Param('reward_id', ParseIntPipe) reward_id : number){
    console.log('userId : '+ userId)
    console.log('userId:', userId, typeof userId);
    return this.rewardService.redeemReward(userId, reward_id);
  }

  @Get('getReedeem')
  getReedeem(@CurrentUserId() userId: string){
    return this.rewardService.getRedeem(userId)
  }

}
