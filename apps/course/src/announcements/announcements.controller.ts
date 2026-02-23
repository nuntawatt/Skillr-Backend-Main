import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard, Roles, RolesGuard } from '@auth';
import { UserRole } from '@common/enums';

import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AnnouncementResponseDto } from './dto/announcement-response.dto';
import { AnnouncementsService } from './announcements.service';

@ApiTags('Announcements')
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) { }

  @Get('active')
  @ApiOperation({ 
    summary: 'ดึงป้ายประกาศที่ใช้งานได้ (Public)', 
    description: '**Public Endpoint - ไม่ต้อง Login**\n\nดึงป้ายประกาศที่ active และอยู่ในช่วงเวลาที่กำหนด พร้อม placeholder image ถ้าไม่มีรูปภาพ\n\n🔓 **ไม่ต้อง Authentication** - ทุกคนสามารถเรียกได้\n📱 **ใช้สำหรับ** - Frontend แสดงป้ายประกาศในหน้าแรก' 
  })
  @ApiResponse({
    status: 200,
    description: '**ดึงป้ายประกาศสำเร็จ (Public)**\n\n✅ สำเร็จ - คืนข้อมูลป้ายประกาศที่ active ทั้งหมด\n🖼️ มี placeholder image ถ้าป้ายไม่มีรูปภาพจริง\n🔓 ไม่ต้อง Authentication',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              announcement_id: { type: 'number', example: 1 },
              title: { type: 'string', example: '🔥 เปิดคอร์สใหม่! React Advanced 2025' },
              imageUrl: {
                type: 'string',
                example: 'https://cdn.example.com/banners/react-course-2025.jpg',
                nullable: true
              },
              deepLink: { type: 'string', example: '/courses/react-advanced-2025' },
              activeStatus: { type: 'boolean', example: true },
              priority: { type: 'number', example: 10 },
              startDate: { type: 'string', example: '2025-02-20T00:00:00Z', nullable: true },
              endDate: { type: 'string', example: '2025-03-20T23:59:59Z', nullable: true },
              createdAt: { type: 'string', example: '2025-02-17T10:00:00Z' },
              updatedAt: { type: 'string', example: '2025-02-17T10:00:00Z' },
            },
          },
        },
      },
    },
  })
  
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  async findActive() {
    const data = await this.announcementsService.findActive();
    const placeholderImageUrl = this.announcementsService.getPlaceholderImageUrl();

    return {
      success: true,
      data: data.map((a) => ({
        ...a,
        imageUrl: a.imageUrl || placeholderImageUrl || null,
      })),
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({ 
    summary: 'สร้างป้ายประกาศใหม่ (Admin Only)', 
    description: '**Admin Only - ต้อง Login + Admin Role**\n\nAdmin เท่านั้นสามารถสร้างป้ายประกาศใหม่ได้ สามารถกำหนดรูปภาพ ลิงก์ และช่วงเวลาที่แสดงได้\n\n🔐 **ต้อง Authentication** - JWT Token + Admin Role\n📝 **สร้างป้าย** - สามารถกำหนด deepLink, date range, priority' 
  })
  @ApiResponse({
    status: 201,
    description: 'สร้างป้ายประกาศใหม่ (Admin เท่านั้น)',
    type: AnnouncementResponseDto,
  })
  async create(@Body() dto: CreateAnnouncementDto) {
    return this.announcementsService.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  @ApiOperation({ summary: 'ดึงป้ายประกาศทั้งหมด', description: 'Admin เท่านั้นสามารถดึงป้ายประกาศทั้งหมดได้ รวมทั้งที่ไม่ active' })
  @ApiResponse({
    status: 200,
    description: 'ดึงป้ายประกาศทั้งหมด (Admin เท่านั้น)',
  })
  async findAll() {
    return this.announcementsService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'ดึงป้ายประกาศตาม ID', description: 'Admin เท่านั้นสามารถดึงรายละเอียดป้ายประกาศตาม ID ที่ระบุได้' })
  @ApiResponse({
    status: 200,
    description: 'ดึงป้ายประกาศตาม ID (Admin เท่านั้น)',
    type: AnnouncementResponseDto,
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.announcementsService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'อัปเดตป้ายประกาศ', description: 'Admin เท่านั้นสามารถแก้ไขข้อมูลป้ายประกาศได้ เช่น หัวข้อ รูปภาพ ลิงก์ หรือสถานะ' })
  @ApiResponse({
    status: 200,
    description: 'อัปเดตป้ายประกาศ (Admin เท่านั้น)',
    type: AnnouncementResponseDto,
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.announcementsService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(':id/upload-image')
  @ApiOperation({
    summary: 'อัปโหลดรูปภาพป้ายประกาศ',
    description: 'Admin เท่านั้นสามารถอัปโหลดรูปภาพสำหรับป้ายประกาศได้ รองรับไฟล์ jpg/png/webp ขนาดสูงสุด 5MB และจะอัปโหลดไปยัง S3 และอัปเดต URL ให้อัตโนมัติ'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Banner image file to upload (max 5MB, jpg/png/webp)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'อัปโหลดรูปภาพป้ายประกาศ (Admin เท่านั้น)',
    type: AnnouncementResponseDto,
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.announcementsService.uploadBannerImage(id, file);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'ลบป้ายประกาศ', description: 'Admin เท่านั้นสามารถลบป้ายประกาศตาม ID ที่ระบุได้ การลบจะถาวรและไม่สามารถกู้คืนได้' })
  @ApiResponse({
    status: 204,
    description: 'ลบป้ายประกาศ (Admin เท่านั้น)',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.announcementsService.remove(id);
  }
}
