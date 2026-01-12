import type { AuthUser } from '@auth';
import { UserRole } from '@common/enums';
import { JwtAuthGuard, Roles, RolesGuard } from '@auth';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaAssetsService } from './media-assets.service';
import { CreateVideoUploadDto } from './dto/create-video-upload.dto';
import { Body, Controller, Get, Param, Post, Redirect, Req, UploadedFile, UseGuards, UseInterceptors, Res } from '@nestjs/common';
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
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a video upload record' })
  @ApiConsumes('application/json')
  @ApiBody({ type: CreateVideoUploadDto })

  @ApiResponse({ status: 201, description: 'Video upload record created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  createUpload(
    @Body() dto: CreateVideoUploadDto,
    @Req() req: RequestWithUserAndBody,
  ) {
    return this.mediaAssetsService.createVideoUpload(dto, req.user ?? {});
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
          description: 'Optional media asset ID',
          type: 'number',
          example: 1,
        },
        owner_user_id: {
          description: 'Optional owner user ID',
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
    @UploadedFile() file: Express.Multer.File,
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

  // Flow: Stream Video File by Key
  @Get('presign/:key')
  @ApiOperation({ summary: 'Stream a video file by its storage key' })
  @ApiParam({
    name: 'key',
    example: 'videos/44f6ea80-45a8-445c-bf2b-62abe443096b/skllr.mp4'
  })
  @ApiResponse({ status: 200, description: 'Presigned URL retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  async streamFileByKey(@Param('key') key: string, @Res() res: any) {
    return this.mediaAssetsService.streamObjectByKey(key, res);
  }
}
