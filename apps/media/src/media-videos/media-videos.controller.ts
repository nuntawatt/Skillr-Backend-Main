// apps/media/src/media-videos/media-videos.controller.ts
import {
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
  Get,
  Param,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

import { MediaVideosService } from './media-videos.service';
import { CreateVideoUploadDto } from './dto/create-video-upload.dto';

type RequestWithUser = { user?: { sub?: number } };

@ApiTags('Media Videos')
@Controller('media/videos')
export class MediaVideosController {
  constructor(private readonly svc: MediaVideosService) {}

  /**
   * 🎬 Upload video via form-data (server-side upload)
   */
  @Post('upload')
  @ApiOperation({ summary: 'Upload video file via form-data' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Video file' },
        owner_user_id: { type: 'number', description: 'Owner user ID (optional)' },
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
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: Record<string, any>,
  ) {
    const ownerUserId = body?.owner_user_id ? Number(body.owner_user_id) : undefined;
    return this.svc.uploadVideoFileAndPersist(file, ownerUserId);
  }

  /**
   * 1️⃣ ขอ presigned URL สำหรับ upload (สำหรับไฟล์ใหญ่)
   */
  @Post('presign')
  @ApiOperation({ summary: 'Create presigned URL for video upload (for large files)' })
  @ApiCreatedResponse({ description: 'Presigned URL created' })
  async presign(
    @Body() dto: CreateVideoUploadDto,
    @Req() req: RequestWithUser,
  ) {
    return this.svc.createPresignedUpload(dto, req.user);
  }

  /**
   * 2️⃣ แจ้ง backend ว่า upload เสร็จแล้ว
   */
  @Post('confirm')
  @ApiOperation({ summary: 'Confirm video upload' })
  @ApiResponse({ status: 200, description: 'Upload confirmed' })
  async confirm(
    @Body('media_asset_id') mediaAssetId: number,
  ) {
    return this.svc.confirmUpload(mediaAssetId);
  }

  /**
   * 3️⃣ Get presigned URL to view/download video by ID
   */
  @Get('view/:id')
  @ApiOperation({ summary: 'Get presigned URL to view video by ID' })
  @ApiResponse({ status: 200, description: 'Presigned URL for viewing' })
  async getViewUrl(@Param('id') id: string) {
    return this.svc.getPresignedViewUrl(Number(id));
  }

  /**
   * 4️⃣ Delete video by ID
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete video by ID' })
  @ApiResponse({ status: 200, description: 'Video deleted' })
  async deleteVideo(@Param('id') id: string) {
    return this.svc.deleteVideoById(Number(id));
  }
}
