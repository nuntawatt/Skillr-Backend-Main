import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Redirect,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '@auth';
import type { AuthUser } from '@auth';
import { UserRole } from '@common/enums';
import { MediaAssetsService } from './media-assets.service';
import { CreateVideoUploadDto } from './dto/create-video-upload.dto';
import { FileInterceptor } from '@nestjs/platform-express';

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

@Controller('media/videos')
export class MediaVideosController {
  constructor(private readonly mediaAssetsService: MediaAssetsService) {}

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
  getPlaybackInfo(@Param('id') id: string) {
    return this.mediaAssetsService.getVideoPlaybackInfo(Number(id));
  }

  @Post('upload')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
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
  getFileUrl(@Param('key') key: string) {
    return this.mediaAssetsService.getVideoFileUrl(key);
  } 

  // Example: http://10.3.1.88:3002/api/media/videos/file/<key>/redirect
  @Get('file/:key/redirect')
  @Redirect()
  async redirectToFile(@Param('key') key: string) {
    const url = await this.mediaAssetsService.getVideoFileUrl(key);
    return { url };
  }

  // Stream the video file through the API so the client does not need direct
  @Get('presign/:key')
  async streamFileByKey(@Param('key') key: string, @Res() res: any) {
    return this.mediaAssetsService.streamObjectByKey(key, res);
  }
}
