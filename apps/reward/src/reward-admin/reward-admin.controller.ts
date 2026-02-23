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
import { AdminService } from './reward-admin.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
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
  constructor(private readonly adminService: AdminService) {}

  @Post('/reward/create')
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
        'total_limit'
      ],
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        required_points: { type: 'number' },
        redeem_start_date: { type: 'string', format: 'date-time' },
        redeem_end_date: { type: 'string', format: 'date-time' },
        expire_after_days: { type: 'number' },
        limit_per_user: { type: 'number' },
        total_limit: { type: 'number' },
        show_remaining_threshold: { type: 'number' },
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
    const imgUrl = await this.adminService.uploadRewardImage(file);

    const rewardCreated = await this.adminService.createReward(
      createRewardDto,
      imgUrl,
    );
    return {
      message: 'Create reward success',
    };
  }

  @Patch('reward/update/:id')
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
      imageUrl = await this.adminService.uploadRewardImage(file);
    }

    const updatedReward = this.adminService.updateReward(id, dto, imageUrl);

    return {
      message: "Update reward success"
    };
  }
  
  @Delete('reward/delete/:id')
  async deleteReward(@Param('id', ParseIntPipe) id: number){
    const removeReward = await this.adminService.removeRewardById(id);

    return {
      message: "Remove reward success"
    }
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
