import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '@auth';
import { UserRole } from '@common/enums';
import { MediaAssetsService } from './media-assets.service';
import { CreateVideoUploadDto } from './dto/create-video-upload.dto';
import { CompleteVideoUploadDto } from './dto/complete-video-upload.dto';

@Controller('media/videos')
export class MediaVideosController {
  constructor(private readonly mediaAssetsService: MediaAssetsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createUpload(@Body() dto: CreateVideoUploadDto, @Req() req: any) {
    return this.mediaAssetsService.createVideoUpload(dto, req.user);
  }

  // ตามสเปกที่คุณกำหนด: POST /api/media/videos/media_asset/:id
  @Post('media_asset/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  completeUpload(
    @Param('id') id: string,
    @Body() dto: CompleteVideoUploadDto,
    @Req() req: any,
  ) {
    return this.mediaAssetsService.completeVideoUploadByMediaAssetId(Number(id), dto, req.user);
  }
}
