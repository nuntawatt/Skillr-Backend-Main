import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './reward-admin.service';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { CreateRewardAdminResponseDto } from './dto/create-reward-response-admin.dto';
import { JwtAuthGuard, Roles, RolesGuard } from '@auth';
import { UserRole } from '@common/enums';

@ApiTags('Reward Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('/create')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: CreateRewardAdminResponseDto })
  async createReward(@Body() createRewardDto: CreateRewardAdminResponseDto) {
    const rewardCreated = await this.adminService.createReward(createRewardDto);
    return {
      message: 'Create reward success',
    };
  }

  // @Post()
  // create(@Body() createAdminDto: CreateAdminDto) {
  //   return this.adminService.create(createAdminDto);
  // }

  // @Get()
  // findAll() {
  //   return this.adminService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.adminService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateAdminDto: UpdateAdminDto) {
  //   return this.adminService.update(+id, updateAdminDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.adminService.remove(+id);
  // }
}
