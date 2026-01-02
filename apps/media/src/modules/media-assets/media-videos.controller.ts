import { Body, Controller, Get, Param, Post, Redirect, Req, UploadedFile, UseGuards, UseInterceptors, Res } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '@auth';
import type { AuthUser } from '@auth';
import { UserRole } from '@common/enums';
import { MediaAssetsService } from './media-assets.service';
import { CreateVideoUploadDto } from './dto/create-video-upload.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiParam, ApiResponse } from '@nestjs/swagger';

type RequestWithUserAndBody = {
  user?: AuthUser;
  body?: unknown;
};

function parseOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return undefined;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

@ApiTags('Media Videos')
@Controller('media/videos')
export class MediaVideosController {
  constructor(private readonly mediaAssetsService: MediaAssetsService) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createUpload(
    @Body() dto: CreateVideoUploadDto,
    @Req() req: RequestWithUserAndBody,
  ) {
    return this.mediaAssetsService.createVideoUpload(dto, req.user ?? {});
  }

  @Get(':id/payback')
  @ApiOperation({ summary: 'Get video playback info' })
  @ApiParam({
    name: 'id',
    example: '10'
  })
  @ApiResponse({
    status: 200,
    description: 'Playback info retrieved successfully'
  })
  getPlaybackInfo(@Param('id') id: string) {
    return this.mediaAssetsService.getVideoPlaybackInfo(Number(id));
  }

  @Post('upload')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a video file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary'
        },
        media_asset_id: {
          type: 'number',
          example: 1,
        },
        owner_user_id: {
          type: 'number',
          example: 1,
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Video uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  uploadFile(
    @UploadedFile('file') file: Express.Multer.File,
    @Req() req: RequestWithUserAndBody,
  ) {
    const body =
      typeof req.body === 'object' && req.body !== null
        ? (req.body as Record<string, unknown>)
        : {};

    const rawId = body['media_asset_id'] ?? body['mediaAssetId'];
    const mediaAssetId = parseOptionalNumber(rawId);

    const rawOwner = body['owner_user_id'] ?? body['ownerUserId'];
    const ownerUserId = parseOptionalNumber(rawOwner);

    return this.mediaAssetsService.uploadVideoFileAndPersist(
      file,
      req.user,
      mediaAssetId,
      ownerUserId,
    );
  }

  @Get('file/:key')
  @ApiOperation({ summary: 'Get video file URL by storage key' })
  @ApiParam({
    name: 'key',
    example: 'videos/44f6ea80-45a8-445c-bf2b-62abe443096b/720p.mp4'
  })
  @ApiResponse({ status: 200, description: 'Video file URL retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  getFileUrl(@Param('key') key: string) {
    return this.mediaAssetsService.getVideoFileUrl(key);
  }

  @Get('file/:key/redirect')
  @ApiOperation({ summary: 'Redirect to video file URL by storage key' })
  @ApiParam({
    name: 'key',
    example: 'videos/44f6ea80-45a8-445c-bf2b-62abe443096b/720p.mp4'
  })
  @ApiResponse({ status: 302, description: 'Redirected to video URL successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Redirect()
  async redirectToFile(@Param('key') key: string) {
    const url = await this.mediaAssetsService.getVideoFileUrl(key);
    return { url };
  }

  // Stream the video file through the API so the client does not need direct
  @Get('presign/:key')
  @ApiOperation({ summary: 'Stream a video file by its storage key' })
  @ApiParam({
    name: 'key',
    example: 'videos/44f6ea80-45a8-445c-bf2b-62abe443096b/720p.mp4'
  })
  @ApiResponse({ status: 200, description: 'Presigned URL retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async streamFileByKey(@Param('key') key: string, @Res() res: any) {
    return this.mediaAssetsService.streamObjectByKey(key, res);
  }
}
