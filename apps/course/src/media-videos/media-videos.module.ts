import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaVideosController } from './media-videos.controller';
import { MediaVideosService } from './media-videos.service';
import { VideoAsset } from './entities/video-asset.entity';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([VideoAsset]), StorageModule],
  controllers: [MediaVideosController],
  providers: [MediaVideosService],
  exports: [MediaVideosService],
})
export class MediaVideosModule {}
