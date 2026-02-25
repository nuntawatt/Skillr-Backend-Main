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
  UploadedFile,
  UseInterceptors,
  ParseIntPipe,
} from '@nestjs/common';
import { RewardAdminService } from './reward-admin.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateRewardAdminResponseDto } from './dto/create-reward-response-admin.dto';
import { JwtAuthGuard, Roles, RolesGuard } from '@auth';
import { UserRole } from '@common/enums';
import { CreateRewardAdminDto } from './dto/create-reward-admin.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import multer from 'multer';
import { UpdateRewardAdminDto } from './dto/update-reward-admin.dto';

@ApiTags('Reward Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly RewardAdminService: RewardAdminService) {}

  @Get('/reward/getAllAdminReward')
  @ApiOperation({ summary: 'Get reward admin ทั้งหมด' })
  GetAllReward() {
    return this.RewardAdminService.getAllReward();
  }

  @Get('/reward/:reward_id/adminRewardDetail')
  @ApiOperation({ summary: 'Get admin reward detail by reward_id' })
  @ApiParam({
    name: 'reward_id',
    type: Number,
    required: true,
    description: 'Reward ID',
    example: 1,
  })
  getRewardDetail(@Param('reward_id', ParseIntPipe) reward_id: number) {
    return this.RewardAdminService.getRewardDetail(reward_id);
  }

  @Post('/reward/create')
  @ApiOperation({ summary: 'สร้าง reward โดยต้องกรอกข้อมูลให้ครบ (ไม่รับ 0 บาง field)' })
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'image',
        'name',
        'required_points',
        'description',
        'redeem_start_date',
        'redeem_end_date',
        'is_active',
      ],
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        required_points: { type: 'number' },
        redeem_start_date: { type: 'string', format: 'date-time' },
        redeem_end_date: { type: 'string', format: 'date-time' },
        limit_per_user: { type: 'number' },
        total_limit: { type: 'number' },
        is_active: { type: 'boolean' },
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiCreatedResponse({ type: CreateRewardAdminResponseDto })
  async createReward(
    @UploadedFile() file: Express.Multer.File,
    @Body() createRewardDto: CreateRewardAdminDto,
  ) {
    const imgUrl = await this.RewardAdminService.uploadRewardImage(file);

    const rewardCreated = await this.RewardAdminService.createReward(
      createRewardDto,
      imgUrl,
    );
    return {
      message: 'Create reward success',
    };
  }

  @Patch('reward/update/:id')
  @ApiOperation({ summary: 'แก้ไขข้อมูลของ reward' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async updateReward(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UpdateRewardAdminDto,
  ) {
    let imageUrl: string | undefined;

    if (file) {
      imageUrl = await this.RewardAdminService.uploadRewardImage(file);
    }

    const updatedReward = this.RewardAdminService.updateReward(
      id,
      dto,
      imageUrl,
    );

    return {
      message: 'Update reward success',
    };
  }

  @Delete('reward/delete/:id')
  @ApiOperation({ summary: 'Delete reward by reward_id (Soft delete)' })
  async deleteReward(@Param('id', ParseIntPipe) id: number) {
    const removeReward = await this.RewardAdminService.removeRewardById(id);

    return {
      message: 'Remove reward success',
    };
  }

  // @Post()
  // create(@Body() createAdminDto: CreateAdminDto) {
  //   return this.RewardAdminService.create(createAdminDto);
  // }

  // @Get()
  // findAll() {
  //   return this.RewardAdminService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.RewardAdminService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateAdminDto: UpdateAdminDto) {
  //   return this.RewardAdminService.update(+id, updateAdminDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.RewardAdminService.remove(+id);
  // }
}
