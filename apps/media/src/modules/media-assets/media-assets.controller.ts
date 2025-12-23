import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '@auth';
import { UserRole } from '@common/enums';
import { MediaAssetsService } from './media-assets.service';

@Controller('media/assets')
export class MediaAssetsController {
  constructor(private readonly mediaAssetsService: MediaAssetsService) {}

  // ใช้สำหรับ Course service ตรวจว่า asset READY ก่อน attach
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getOne(@Param('id') id: string) {
    return this.mediaAssetsService.getAsset(Number(id));
  }

  // Frontend uses this to get a watchable URL from the same LAN.
  // Requires login (any role). If you want public links, we can add a separate unauth route later.
  @Get(':id/url')
  @UseGuards(JwtAuthGuard)
  getPlaybackUrl(@Param('id') id: string) {
    return this.mediaAssetsService.getVideoUrlByMediaAssetId(Number(id));
  }
}
