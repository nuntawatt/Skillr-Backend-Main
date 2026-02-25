import { Controller, Get, Patch, Body, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Param, Headers } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { UsersService } from './users.service';
import { UpdateUserDto } from './dto';
import { JwtAuthGuard, CurrentUserId } from '@auth';

import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('User')
@ApiBearerAuth('access-token')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) { }

  // =========================
  // Profile
  // =========================

  @Get('profile')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async getProfile(
    @CurrentUserId() userId: string,
    @Headers('authorization') authorization: string
  ) {
    console.log('User ID from JWT:', userId);
    
    const user = await this.usersService.findById(userId);
    
    // ดึงข้อมูลจาก course service (เหมือน /learner/home)
    const courseBaseUrl = this.configService.get<string>(
      'COURSE_BASE_URL',
      'http://localhost:3002/api',
    );

    let avatarUrl: string | null = null;
    let xp: number | null = null;
    let streakDays: number | null = null;
    let completedCourses: any[] = [];

    // ใช้ avatar จาก user entity โดยตรง (ไม่ต้องเรียน course service)
    avatarUrl = user.avatar || null;

    try {
      // เรียก /learner/home เพื่อดึงข้อมูล xp, streakDays, completedCourses เท่านั้น
      const response = await this.httpService.axiosRef.get(
        `${courseBaseUrl}/learner/home`,
        {
          headers: {
            Authorization: authorization,
            'X-Internal-Call': 'true', // บอกว่านี่คือ internal call
          },
          timeout: 5000, // 5 seconds timeout
        }
      );

      const learnerHomeData = response.data;
      if (learnerHomeData?.header) {
        xp = learnerHomeData.header.xp || null;
        streakDays = learnerHomeData.header.streakDays || null;
      }
      
      // ดึง completed courses จาก myCourses ที่มี progressPercent = 100
      if (learnerHomeData?.myCourses) {
        completedCourses = learnerHomeData.myCourses
          .filter((course: any) => course.progressPercent === 100)
          .map((course: any) => ({
            course_id: course.course_id,
            title: course.title,
            completed: true, // เปลี่ยนจาก progressPercent เป็น completed
          }));
      }
    } catch (error) {
      // ถ้าเรียกไม่ได้ ใช้ค่า default
      console.log('Failed to fetch from course service, using defaults');
      console.log('Error:', error.message);
      
      // ถ้าเป็น timeout หรือ infinite loop ให้หยุดการเรียกซ้ำ
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        console.log('Request timeout - possible infinite loop detected');
      }
    }

    return {
      id: user.id,
      email: user.email || '',
      username: user.username || null, // เพิ่มกลับมา
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role,
      isVerified: user.isVerified || false, // เพิ่มกลับมา
      status: user.status,
      avatarUrl,
      xp,
      streakDays,
      completedCourses, // เพิ่ม completed courses
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Patch('profile')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'User profile updated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async updateProfile(
    @CurrentUserId() userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(userId, dto);
  }

  // =========================
  // Avatar Upload
  // =========================

  @Patch('avatar')
  @ApiOperation({ summary: 'Upload or update user avatar' })
  @ApiResponse({ status: 200, description: 'Avatar uploaded successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png'];
        if (!allowed.includes(file.mimetype)) {
          return cb(
            new BadRequestException('Only JPG and PNG are allowed'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadAvatar(
    @CurrentUserId() userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.usersService.uploadAvatar(userId, file);
  }

  
  @Get('avatar/:id')
  @ApiOperation({ summary: 'Get user avatar by ID' })
  @ApiResponse({ status: 200, description: 'User avatar retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async getAvatar(@Param('id') id: string) {
    const url = await this.usersService.getAvatarPresignedUrl(id);
    return { url };
  }
}
