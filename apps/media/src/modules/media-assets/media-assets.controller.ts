import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Redirect,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '@auth';
import { UserRole } from '@common/enums';
import { MediaAssetsService } from './media-assets.service';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';

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

@Controller('media/assets')
export class MediaAssetsController {
  constructor(private readonly mediaAssetsService: MediaAssetsService) {}

  // Public (no-login) image upload for now.
  // Returns media_asset_id + public_url (when configured).
  @Post('images/upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(
    @UploadedFile('file') file: Express.Multer.File,
    @Body() body: Record<string, unknown>,
  ) {
    const ownerUserId = parseOptionalNumber(body?.['owner_user_id'] ?? body?.['ownerUserId']);
    return this.mediaAssetsService.uploadImageFileAndPersist(file, ownerUserId);
  }

  // Public (no-login) video playback URL. Use this if you want to fetch the signed URL.
  @Get(':id/url/public')
  getPlaybackUrlPublic(@Param('id') id: string) {
    return this.mediaAssetsService.getVideoUrlByMediaAssetId(Number(id));
  }

  // Public (no-login) redirect to a signed URL. Use this as a <video src> directly.
  @Get(':id/url/public/redirect')
  @Redirect()
  async redirectToPlaybackUrlPublic(@Param('id') id: string) {
    const url = await this.mediaAssetsService.getVideoUrlByMediaAssetId(
      Number(id),
    );
    return { url };
  }

  // Public (no-login) image signed URL.
  @Get(':id/image/url/public')
  getImageUrlPublic(@Param('id') id: string) {
    return this.mediaAssetsService.getImageUrlByMediaAssetId(Number(id));
  }

  // Public (no-login) redirect to an image signed URL.
  @Get(':id/image/url/public/redirect')
  @Redirect()
  async redirectToImageUrlPublic(@Param('id') id: string) {
    const url = await this.mediaAssetsService.getImageUrlByMediaAssetId(
      Number(id),
    );
    return { url };
  }

  // Stream the image through the API so the client does not need direct
  // access to MinIO. Example: GET /api/media/assets/123/file/public/stream
  @Get(':id/file/public/stream')
  async streamFilePublic(@Param('id') id: string, @Res() res: Response) {
    return this.mediaAssetsService.streamObjectByMediaAssetId(Number(id), res);
  }

  // Public (no-login) status check: READY/UPLOADING/PROCESSING/FAILED.
  @Get(':id/status/public')
  getStatusPublic(@Param('id') id: string) {
    return this.mediaAssetsService.getPublicAssetStatus(Number(id));
  }

  // ใช้สำหรับ Course service ตรวจว่า asset READY ก่อน attach
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getOne(@Param('id') id: string) {
    return this.mediaAssetsService.getAsset(Number(id));
  }

  // Frontend uses this to get a watchable URL from the same LAN.
  @Get(':id/url')
  @UseGuards(JwtAuthGuard)
  getPlaybackUrl(@Param('id') id: string) {
    return this.mediaAssetsService.getVideoUrlByMediaAssetId(Number(id));
  }
}
