import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaAsset } from './entities/media-asset.entity';
import { MediaAssetsService } from './media-assets.service';
import { MediaVideosController } from './media-videos.controller';
import { MediaAssetsController } from './media-assets.controller';
import { MediaAssetsCleanupService } from './media-assets-cleanup.service';

@Module({
  imports: [TypeOrmModule.forFeature([MediaAsset])],
  controllers: [MediaVideosController, MediaAssetsController],
  providers: [MediaAssetsService, MediaAssetsCleanupService],
  exports: [MediaAssetsService],
})
export class MediaAssetsModule {}
