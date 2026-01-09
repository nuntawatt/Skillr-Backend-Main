import { Body, Controller, Get, Param, Post, Req, UploadedFile, UseInterceptors, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { MediaVideosService } from './media-videos.service';
import { CreateVideoUploadDto } from './dto/create-video-upload.dto';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiParam, ApiResponse } from '@nestjs/swagger';

type RequestWithUserAndBody = { user?: any; body?: any };

@ApiTags('Media Videos')
@Controller('media/videos')
export class MediaVideosController {
  constructor(private readonly svc: MediaVideosService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  @ApiOperation({ summary: 'Upload video file (optionally media_asset_id)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        media_asset_id: { type: 'number' },
        owner_user_id: { type: 'number' },
      },
      required: ['file'],
    },
  })
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
  async streamFileByKey(@Param('key') key: string, @Res() res: Response) {
    return this.svc.streamObjectByKey(key, res);
  }
}
