import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { ImageAsset } from '../media-images/entities/image-asset.entity';
import { VideoAsset, VideoAssetStatus } from '../media-videos/entities/video-asset.entity';
import { MediaImagesService } from '../media-images/media-images.service';
import { MediaVideosService } from '../media-videos/media-videos.service';

@Injectable()
export class MediaCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaCleanupService.name);
  private interval?: NodeJS.Timeout;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(ImageAsset) private readonly imageRepo: Repository<ImageAsset>,
    @InjectRepository(VideoAsset) private readonly videoRepo: Repository<VideoAsset>,
    private readonly imagesSvc: MediaImagesService,
    private readonly videosSvc: MediaVideosService,
  ) {}

  onModuleInit() {
    const enabledRaw = this.config.get<string>('MEDIA_ASSET_CLEANUP_ENABLED');
    const enabled = enabledRaw === undefined ? true : enabledRaw === 'true';
    if (!enabled) {
      this.logger.log('Media asset cleanup disabled');
      return;
    }
    const intervalSeconds = Number(this.config.get<string>('MEDIA_ASSET_CLEANUP_INTERVAL_SECONDS') ?? '600');
    const ms = Math.max(30, intervalSeconds) * 1000;
    this.interval = setInterval(() => void this.cleanupOnce(), ms);
    void this.cleanupOnce();
    this.logger.log(`Media asset cleanup started (every ${Math.round(ms / 1000)}s)`);
  }

  onModuleDestroy() {
    if (this.interval) { clearInterval(this.interval); this.interval = undefined; }
  }

  private async cleanupOnce() {
    const ttlSeconds = Number(this.config.get<string>('MEDIA_ASSET_PENDING_TTL_SECONDS') ?? '3600');
    const cutoff = new Date(Date.now() - Math.max(60, ttlSeconds) * 1000);

    const imageCandidates = await this.imageRepo.find({
      where: [{ createdAt: LessThan(cutoff) }],
      take: 200,
    });

    let deleted = 0;
    for (const asset of imageCandidates) {
      try {
        await this.imagesSvc.cleanupDeleteAsset(asset.id);
        deleted += 1;
      } catch (e) {
        this.logger.warn(`Failed to delete image ${asset.id}: ${String(e)}`);
      }
    }

    const videoCandidates = await this.videoRepo.find({
      where: [
        { status: VideoAssetStatus.UPLOADING, createdAt: LessThan(cutoff) },
        { status: VideoAssetStatus.PROCESSING, createdAt: LessThan(cutoff) },
      ],
      take: 200,
    });

    for (const asset of videoCandidates) {
      try {
        await this.videosSvc.cleanupDeleteAsset(asset.id);
        deleted += 1;
      } catch (e) {
        this.logger.warn(`Failed to delete video ${asset.id}: ${String(e)}`);
      }
    }

    if (deleted > 0) this.logger.log(`Cleaned up ${deleted} media assets (cutoff=${cutoff.toISOString()})`);
  }
}
