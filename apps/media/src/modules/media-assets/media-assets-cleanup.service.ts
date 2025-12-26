import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import { MediaAsset, MediaAssetStatus } from './entities/media-asset.entity';
import { MediaAssetsService } from './media-assets.service';

@Injectable()
export class MediaAssetsCleanupService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(MediaAssetsCleanupService.name);
  private interval: NodeJS.Timeout | undefined;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(MediaAsset)
    private readonly mediaAssetsRepository: Repository<MediaAsset>,
    private readonly mediaAssetsService: MediaAssetsService,
  ) {}

  onModuleInit() {
    const enabledRaw = this.configService.get<string>(
      'MEDIA_ASSET_CLEANUP_ENABLED',
    );
    const enabled = enabledRaw === undefined ? true : enabledRaw === 'true';
    if (!enabled) {
      this.logger.log('Media asset cleanup disabled');
      return;
    }

    const intervalSeconds = Number(
      this.configService.get<string>('MEDIA_ASSET_CLEANUP_INTERVAL_SECONDS') ??
        '600',
    );
    const ms = Math.max(30, intervalSeconds) * 1000;

    this.interval = setInterval(() => {
      void this.cleanupOnce();
    }, ms);

    void this.cleanupOnce();
    this.logger.log(
      `Media asset cleanup started (every ${Math.round(ms / 1000)}s)`,
    );
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  private async cleanupOnce() {
    const ttlSeconds = Number(
      this.configService.get<string>('MEDIA_ASSET_PENDING_TTL_SECONDS') ??
        '3600',
    );
    const cutoff = new Date(Date.now() - Math.max(60, ttlSeconds) * 1000);

    const candidates = await this.mediaAssetsRepository.find({
      where: [
        { status: MediaAssetStatus.UPLOADING, createdAt: LessThan(cutoff) },
        { status: MediaAssetStatus.PROCESSING, createdAt: LessThan(cutoff) },
      ],
      take: 200, 
    });

    if (candidates.length === 0) return;

    let deleted = 0;
    for (const asset of candidates) {
      try {
        await this.mediaAssetsService.deleteAssetIfExists(asset.id);
        deleted += 1;
      } catch (e) {
        this.logger.warn(`Failed to delete asset ${asset.id}`);
      }
    }

    this.logger.log(
      `Cleaned up ${deleted} pending media assets (cutoff=${cutoff.toISOString()})`,
    );
  }
}
