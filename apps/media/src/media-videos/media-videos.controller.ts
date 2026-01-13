import { Body, Controller, Get, Param, Post, Req, UploadedFile, UseInterceptors, Res, Delete, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { MediaVideosService } from './media-videos.service';
import { CreateVideoUploadDto } from './dto/create-video-upload.dto';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiParam, ApiResponse, ApiCreatedResponse } from '@nestjs/swagger';

type RequestWithUserAndBody = { user?: any; body?: any; url?: string };

@ApiTags('Media Videos')
@Controller('media/videos')
export class MediaVideosController {
  constructor(private readonly svc: MediaVideosService) { }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  @ApiOperation({ summary: 'Upload video file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateVideoUploadDto })
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
    return this.svc.uploadVideoFileAndPersist(file, req.user, mediaAssetId);
  }

  @Get('presign/*path')
  @ApiOperation({ summary: 'Get presigned URL for a video file' })
  @ApiParam({
    name: 'filePath',
    required: true,
    description: 'presignPath: 40b8cbfd-33ac-4613-b9b3-516be230212a/360p.mp4',
    example: '40b8cbfd-33ac-4613-b9b3-516be230212a/360p.mp4'
  })
  // @ApiBody({ description: 'presignPath: 40b8cbfd-33ac-4613-b9b3-516be230212a/360p.mp4', })

  @ApiResponse({ status: 200, description: 'Presigned URL generated' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getPresignedUrl(@Req() req: RequestWithUserAndBody) {
    // Get everything after /presign/
    if (!req.url) {
      throw new NotFoundException('invalid request');
    }
    const fullPath = req.url.split('/presign/')[1];
    if (!fullPath) {
      throw new NotFoundException('file path is required');
    }
    return this.svc.getPresignedUrl(decodeURIComponent(fullPath));
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