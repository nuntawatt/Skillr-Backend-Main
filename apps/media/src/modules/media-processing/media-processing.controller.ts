import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { MediaProcessingService } from './media-processing.service';
import { TranscodeVideoDto } from './dto/transcode-video.dto';
import { MediaAssetsService } from '../media-assets/media-assets.service';

@Controller('media/processing')
export class MediaProcessingController {
  constructor(
    private readonly mediaProcessingService: MediaProcessingService,
    private readonly mediaAssetsService: MediaAssetsService,
  ) { }

  @Post('video/transcode')
  async transcodeVideo(@Body() dto: TranscodeVideoDto) {
    if (!dto.qualities?.length) {
      throw new BadRequestException('qualities is required');
    }

    const asset = await this.mediaAssetsService.getAssetOrThrow(
      dto.mediaAssetId,
    );

    if (asset.type !== 'video') {
      throw new BadRequestException('asset is not a video');
    }

    const bucket = asset.storageBucket!;
    const sourceKey = asset.storageKey!;

    const qualities = [...new Set(dto.qualities)];

    const outputs = await Promise.all(
      qualities.map(async (quality) => {
        const targetKey = `videos/${asset.id}/${quality}.mp4`;

        await this.mediaProcessingService.transcodeVideo(
          bucket,
          sourceKey,
          targetKey,
          quality,
        );

        return { quality, storage_key: targetKey };
      }),
    );

    return {
      media_asset_id: asset.id,
      outputs,
    };
  }
}
