import { Body, Controller, Get, Param, Post, Redirect, UploadedFile, UseGuards, UseInterceptors, Res, } from '@nestjs/common';
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
  constructor(private readonly mediaAssetsService: MediaAssetsService) { }

  @Post('images/upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(
    @UploadedFile('file') file: Express.Multer.File,
    @Body() body: Record<string, unknown>,
  ) {
    const ownerUserId = parseOptionalNumber(
      body?.['owner_user_id'] ?? body?.['ownerUserId'],
    );
    return this.mediaAssetsService.uploadImageFileAndPersist(file, ownerUserId);
  }

  // Stream the image through the API so the client does not need direct
  @Get('/images/presign/:id')
  async streamFilePublic(@Param('id') id: string, @Res() res: Response) {
    return this.mediaAssetsService.streamObjectByMediaAssetId(Number(id), res);
  }

  // Public: get asset status
  @Get('status/public/:id')
  getStatusPublic(@Param('id') id: string) {
    return this.mediaAssetsService.getPublicAssetStatus(Number(id));
  }

  // Admin-only: get full asset info
  @Get(':id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.ADMIN)
  getOne(@Param('id') id: string) {
    return this.mediaAssetsService.getAsset(Number(id));
  }
}
