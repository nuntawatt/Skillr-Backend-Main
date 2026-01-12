import { Body, Controller, Get, Param, Post, Req, UploadedFile, UseInterceptors, Res, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { MediaVideosService } from './media-videos.service';
import { CreateVideoUploadDto } from './dto/create-video-upload.dto';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiParam, ApiResponse, ApiCreatedResponse } from '@nestjs/swagger';

type RequestWithUserAndBody = { user?: any; body?: any };

// Max file size: 2GB (default)
const MAX_FILE_SIZE = Number(process.env.VIDEO_MAX_SIZE_BYTES ?? 2 * 1024 * 1024 * 1024);

@ApiTags('Media Videos')
@Controller('media/videos')
export class MediaVideosController {
  constructor(private readonly svc: MediaVideosService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { 
    storage: multer.memoryStorage(),
    limits: {
      fileSize: MAX_FILE_SIZE,
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('video/') || file.mimetype === 'application/octet-stream') {
        cb(null, true);
      } else {
        cb(new Error('Only video files are allowed'), false);
      }
    },
  }))
  @ApiOperation({ summary: 'Upload video file (supports AVI, MOV, MKV, WMV, etc. - auto converts to MP4)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Video file (MP4, AVI, MOV, MKV, WMV, FLV, 3GP, OGV, MPEG, etc.)',
        },
        owner_user_id: {
          type: 'number',
          description: 'Optional: Owner user ID',
        },
      },
      required: ['file'],
    },
  })

  @ApiCreatedResponse({ description: 'Video uploaded' })
  @ApiResponse({ status: 201, description: 'Video uploaded' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: RequestWithUserAndBody) {
    const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
    const rawId = body['media_asset_id'] ?? body['mediaAssetId'];
    const mediaAssetId = typeof rawId === 'string' && rawId.trim() !== '' ? Number(rawId) : typeof rawId === 'number' ? rawId : undefined;
    const rawOwner = body['owner_user_id'] ?? body['ownerUserId'];
    const ownerUserId = typeof rawOwner === 'string' && rawOwner.trim() !== '' ? Number(rawOwner) : typeof rawOwner === 'number' ? rawOwner : undefined;
    return this.svc.uploadVideoFileAndPersist(file, req.user, mediaAssetId, ownerUserId);
  }

  @Get('presign/:key')
  @ApiParam({ name: 'key', example: 'abc-uuid' })
  @ApiOperation({ summary: 'Stream a video by key (supports range)' })
  @ApiResponse({ status: 200, description: 'Video stream started' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async streamFileByKey(@Param('key') key: string, @Res() res: Response) {
    return this.svc.streamObjectByKey(key, res);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', example: 10 })
  @ApiOperation({ summary: 'Delete a video asset by ID' })
  @ApiResponse({ status: 200, description: 'Video asset deleted' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Video asset not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async deleteVideoById(@Param('id') id: string) {
    const assetId = Number(id);
    return this.svc.deleteVideoById(assetId);
  }
}