import { Body, Controller, Post, Req, UploadedFile, UseInterceptors, Get, Param, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import * as multer from 'multer';
import { MediaVideosService } from './media-videos.service';
import { CreateVideoUploadDto } from './dto/create-video-upload.dto';

import { ApiTags, ApiOperation, ApiCreatedResponse, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';

type RequestWithUser = { user?: { sub?: number } };

@ApiTags('Media Videos')
@Controller('media/videos')
export class MediaVideosController {
  constructor(private readonly svc: MediaVideosService) { }

  // อัพโหลดวิดีโอผ่าน form-data (สำหรับไฟล์ขนาดเล็ก - สูงสุด 500MB)
  @Post('upload')
  @ApiOperation({ summary: 'Upload video via server-side form-data' })
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
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit for form upload
    }),
  )
  async uploadVideo(@UploadedFile() file: Express.Multer.File, @Body() body: Record<string, any>) {
    return this.svc.uploadVideoFileAndPersist(file);
  }

  // สร้าง presigned URL สำหรับอัพโหลดวิดีโอ (สำหรับไฟล์ขนาดใหญ่ - สูงสุด 2GB)
  @Post('presign')
  @ApiOperation({ summary: 'Create presigned URL for video upload (for large files)' })
  @ApiCreatedResponse({ description: 'Presigned URL created' })
  async presign(@Body() dto: CreateVideoUploadDto, @Req() req: RequestWithUser) {
    return this.svc.createPresignedUpload(dto, req.user);
  }

  // เรียกดู URL สำหรับดูวิดีโอโดยใช้ ID
  @Get(':id')
  @ApiOperation({ summary: 'Get public URL to view video by ID' })
  @ApiResponse({ status: 200, description: 'Public URL for viewing' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async getViewUrl(@Param('id') id: string) {
    return this.svc.getPublicViewUrl(Number(id));
  }

  // Delete video by ID
  @Delete(':id')
  @ApiOperation({ summary: 'Delete video by ID' })
  @ApiResponse({ status: 200, description: 'Video deleted' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async deleteVideo(@Param('id') id: string) {
    return this.svc.deleteVideoById(Number(id));
  }
}
