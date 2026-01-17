// apps/media/src/media-videos/media-videos.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { StorageFactory } from '../storage/storage.factory';
import { VideoAsset, VideoAssetStatus } from './entities/video-asset.entity';
import { CreateVideoUploadDto } from './dto/create-video-upload.dto';

@Injectable()
export class MediaVideosService {
  private readonly logger = new Logger(MediaVideosService.name);

  constructor(
    private readonly storageFactory: StorageFactory,
    @InjectRepository(VideoAsset)
    private readonly repo: Repository<VideoAsset>,
  ) {}

  /**
   * 🎬 Upload video via form-data (server-side upload)
   */
  async uploadVideoFileAndPersist(file: Express.Multer.File, ownerUserIdFromBody?: number) {
    if (!file) throw new BadRequestException('file missing');
    this.validateVideoMime(file.mimetype ?? '');

    const maxSize = Number(process.env.VIDEO_MAX_SIZE_BYTES ?? String(500 * 1024 * 1024)); // 500MB for form upload
    if (file.size > maxSize) throw new BadRequestException('file size exceeds limit');

    const storage = this.storageFactory.video();
    const bucket = storage.bucket;
    const videoId = randomUUID();
    const key = `videos/${videoId}/original.mp4`;

    // Upload to storage
    await storage.putObject(bucket, key, file.buffer, file.size, { 'Content-Type': file.mimetype });

    const ownerUserId = Number(ownerUserIdFromBody ?? 0);
    const publicUrl = typeof storage.buildPublicUrl === 'function' ? storage.buildPublicUrl(bucket, key) : undefined;

    const saved = await this.repo.save(
      this.repo.create({
        ownerUserId,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: String(file.size),
        storageProvider: process.env.STORAGE_PROVIDER_VIDEO ?? process.env.STORAGE_PROVIDER ?? 'minio',
        storageBucket: bucket,
        storageKey: key,
        publicUrl,
        status: VideoAssetStatus.READY,
      }),
    );

    this.logger.log(`Video uploaded: id=${saved.id}, key=${key}, size=${file.size}`);

    return {
      media_asset_id: saved.id,
      key: key.split('/').slice(-2).join('/'),
      storage_key: key,
      public_url: saved.publicUrl,
      status: saved.status,
    };
  }

  /**
   * 1️⃣ สร้าง presigned URL
   */
  async createPresignedUpload(
    dto: CreateVideoUploadDto,
    user?: { sub?: number },
  ) {
    this.validateVideoMime(dto.mime_type);

    const maxSize = Number(
      process.env.VIDEO_MAX_SIZE_BYTES ??
        2 * 1024 * 1024 * 1024, // 2GB
    );

    if (dto.size_bytes > maxSize) {
      throw new BadRequestException('file size exceeds limit');
    }

    const storage = this.storageFactory.video();
    const videoId = randomUUID();
    const key = `videos/${videoId}/original.mp4`;

    // สร้าง presigned PUT URL
    const uploadUrl = await storage.presignPut!(
      storage.bucket,
      key,
      dto.mime_type,
      60 * 15, // 15 นาที
    );

    // บันทึก DB
    const asset = this.repo.create({
      ownerUserId: Number(user?.sub ?? 0),
      originalFilename: dto.original_filename,
      mimeType: dto.mime_type,
      sizeBytes: String(dto.size_bytes),
      storageProvider: 's3',
      storageBucket: storage.bucket,
      storageKey: key,
      status: VideoAssetStatus.UPLOADING,
    });

    const saved = await this.repo.save(asset);

    return {
      media_asset_id: saved.id,
      uploadUrl,
      storageKey: key,
      expires_in: 900,
    };
  }

  /**
   * 2️⃣ confirm upload
   */
  async confirmUpload(mediaAssetId: number) {
    const asset = await this.repo.findOne({
      where: { id: mediaAssetId },
    });

    if (!asset) {
      throw new NotFoundException('video asset not found');
    }

    if (asset.status !== VideoAssetStatus.UPLOADING) {
      throw new BadRequestException('invalid asset state');
    }

    asset.status = VideoAssetStatus.READY;
    await this.repo.save(asset);

    return {
      media_asset_id: asset.id,
      status: asset.status,
    };
  }

  /**
   * 3️⃣ cleanup delete asset (called by cleanup service)
   */
  async cleanupDeleteAsset(id: number) {
    const asset = await this.repo.findOne({ where: { id } });
    if (!asset) return { deleted: false };

    const storage = this.storageFactory.video();
    const bucket = asset.storageBucket ?? storage.bucket;
    const key = asset.storageKey;

    if (bucket && key) {
      try {
        await storage.deleteObject(bucket, key);
      } catch (err) {
        this.logger.warn(`Failed to delete video file ${key}: ${String(err)}`);
      }
    }

    await this.repo.remove(asset);
    return { deleted: true };
  }

  /**
   * 4️⃣ Get presigned URL to view/download video
   */
  async getPresignedViewUrl(id: number) {
    const asset = await this.repo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('video asset not found');

    const storage = this.storageFactory.video();
    const bucket = asset.storageBucket ?? storage.bucket;
    const key = asset.storageKey;

    if (!key) throw new NotFoundException('video file not found');

    // Get presigned GET URL
    const presignGet = (storage as any).presignGet ?? (storage as any).presignedGetObject;
    if (!presignGet || typeof presignGet !== 'function') {
      throw new BadRequestException('presign GET not supported by storage provider');
    }

    const expiresSeconds = Number(process.env.PRESIGN_EXPIRES_SECONDS ?? 3600); // 1 hour default
    const presignedUrl = await presignGet.call(storage, bucket, key, expiresSeconds);

    return {
      media_asset_id: asset.id,
      presigned_url: presignedUrl,
      expires_in: expiresSeconds,
      mime_type: asset.mimeType,
      original_filename: asset.originalFilename,
    };
  }

  /**
   * 5️⃣ Delete video by ID
   */
  async deleteVideoById(id: number) {
    const asset = await this.repo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('video asset not found');

    const storage = this.storageFactory.video();
    const bucket = asset.storageBucket ?? storage.bucket;
    const key = asset.storageKey;

    if (bucket && key) {
      try {
        await storage.deleteObject(bucket, key);
      } catch (err) {
        this.logger.warn(`Failed to delete video file ${key}: ${String(err)}`);
      }
    }

    await this.repo.remove(asset);
    return { deleted: true, media_asset_id: id };
  }

  /**
   * validation
   */
  private validateVideoMime(mimeType: string) {
    const allow = (
      process.env.VIDEO_MIME_ALLOWLIST ??
      'video/mp4,video/webm,video/quicktime,application/octet-stream'
    )
      .split(',')
      .map((x) => x.trim().toLowerCase());

    if (!allow.includes(mimeType.toLowerCase())) {
      throw new BadRequestException(
        `mime type not allowed: ${mimeType}`,
      );
    }
  }
}
