import { Body, Controller, Post, Req, UploadedFile, UseInterceptors, Get, Param, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import * as multer from 'multer';
import { MediaVideosService } from './media-videos.service';
import { CreateVideoUploadDto } from './dto/create-video-upload.dto';
import { CreateVideoPresignDto } from './dto/create-video-presign.dto';

import { ApiTags, ApiOperation, ApiCreatedResponse, ApiResponse, ApiConsumes, ApiBody, ApiParam } from '@nestjs/swagger';
import type { AuthUser } from '@auth';



@ApiTags('Media Videos')
@Controller('media/videos')
export class MediaVideosController {
  constructor(private readonly svc: MediaVideosService) { }

  // อัพโหลดวิดีโอผ่าน form-data (สำหรับไฟล์ขนาดเล็ก - สูงสุด 1GB)
  @Post('upload')
  @ApiOperation({ summary: 'อัปโหลดวิดีโอผ่านฟอร์มดาต้าฝั่งเซิร์ฟเวอร์' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Video file' },
      },
      required: ['file'],
    },
  })
  @ApiCreatedResponse({ description: 'Video uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or file size exceeds limit' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 1 * 1024 * 1024 * 1024 }, // 1GB limit for form upload
    }),
  )
  async uploadVideo(@UploadedFile() file: Express.Multer.File, @Body() body: Record<string, any>) {
    return this.svc.uploadVideoFileAndPersist(file);
  }

  // สร้าง presigned URL สำหรับอัพโหลดวิดีโอ (สำหรับไฟล์ขนาดใหญ่ - สูงสุด 2GB)
  @Post('presign')
  @ApiOperation({ summary: 'สร้าง URL ที่ลงชื่อล่วงหน้าสำหรับการอัปโหลดวิดีโอ (สำหรับไฟล์ขนาดใหญ่)' })
  @ApiBody({ type: CreateVideoPresignDto })
  @ApiCreatedResponse({ description: 'Presigned URL created' })
  @ApiResponse({ status: 400, description: 'Invalid input or file size exceeds limit' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async presign(@Body() dto: CreateVideoPresignDto) {
    return this.svc.createPresignedUpload(dto);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm uploaded file exists in S3 and mark READY' })
  @ApiResponse({ status: 200, description: 'Confirmed' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  @ApiResponse({ status: 400, description: 'File not uploaded yet' })
  async confirm(@Param('id') id: string) {
    return this.svc.confirmUpload(Number(id));
  }

  // เรียกดู URL สำหรับดูวิดีโอโดยใช้ ID
  @Get(':id')
  @ApiOperation({ summary: 'รับ URL สาธารณะเพื่อดูวิดีโอตาม ID' })
  @ApiResponse({ status: 200, description: 'Public URL for viewing' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getViewUrl(@Param('id') id: string) {
    return this.svc.getPublicViewUrl(Number(id));
  }

  // Delete video by ID
  @Delete(':id')
  @ApiOperation({ summary: 'ลบวิดีโอตาม ID' })
  @ApiResponse({ status: 200, description: 'Video deleted' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async deleteVideo(@Param('id') id: string) {
    return this.svc.deleteVideoById(Number(id));
  }
}
