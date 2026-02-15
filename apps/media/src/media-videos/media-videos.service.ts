import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import * as path from 'path';

import { StorageFactory } from '../storage/storage.factory';
import { VideoAsset, VideoAssetStatus } from './entities/video-asset.entity';
import { CreateVideoUploadDto } from './dto/create-video-upload.dto';
import { AwsService } from '../storage/aws.service';
import { CreateVideoPresignDto } from './dto/create-video-presign.dto';

@Injectable()
export class MediaVideosService {
  private readonly logger = new Logger(MediaVideosService.name);

  constructor(
    private readonly storageFactory: StorageFactory,
    @InjectRepository(VideoAsset)
    private readonly repo: Repository<VideoAsset>,
    private readonly aws: AwsService
  ) { }

  // helper: sanitize filename to avoid path traversal / weird chars
  private sanitizeFilename(filename: string) {
    if (!filename) return `${randomUUID()}.mp4`;
    // remove path parts, replace spaces with underscore, remove control chars
    const base = path.basename(filename);
    return base
      .replace(/[\/\\?%*:|"<>]/g, '')   // remove illegal chars
      .replace(/\s+/g, '_')             // space → _
      .slice(0, 200); // limit length
  }

  // [DEV] simple presign (kept for backwards compatibility if used)
  async createPresign(dto: CreateVideoPresignDto) {
    // prefer dto.original_filename if present
    const id = this.aws.generateVideoId();
    const originalName = this.sanitizeFilename(dto.original_filename ?? `${id}.mp4`);
    const originalKey = `videos/original/${id}/${originalName}`;
    const expires = Number(process.env.PRESIGN_EXPIRES_SECONDS || 3600);

    const uploadUrl = await this.aws.createPresignedUploadUrl(originalKey, dto.mime_type, expires);

    // optional: create DB record with status UPLOADING
    // await this.repo.save({ id: id, original_key: originalKey, status: 'UPLOADING' });

    return {
      video_id: id,
      key: originalKey,
      upload_url: uploadUrl,
      expires_in: expires,
    };
  }

  // Trigger video transcode
  async triggerTranscode(videoId: string) {
    if (!videoId) throw new BadRequestException('video_id required');

    const inputS3 = `s3://${process.env.S3_BUCKET}/videos/original/${videoId}.mp4`;
    const outputPrefix = `videos/hls/${videoId}/`;
    const role = process.env.MEDIACONVERT_ROLE_ARN!;
    if (!role) throw new BadRequestException('MEDIACONVERT_ROLE_ARN not configured');

    const job = await this.aws.createMediaConvertJob(inputS3, outputPrefix, role);

    return {
      jobId: job?.Id,
      status: 'SUBMITTED',
    };
  }

  // Upload video file (form upload)
  async uploadVideoFileAndPersist(file: Express.Multer.File, ownerUserIdFromBody?: number) {
    if (!file) throw new BadRequestException('file missing');
    this.validateVideoMime(file.mimetype ?? '');

    const maxSize = Number(process.env.VIDEO_MAX_SIZE_BYTES ?? String(500 * 1024 * 1024)); // 500MB for form upload
    if (file.size > maxSize) throw new BadRequestException('file size exceeds limit');

    const storage = this.storageFactory.video();
    const bucket = storage.bucket;
    const videoId = randomUUID();
    const safeName = this.sanitizeFilename(file.originalname || `${videoId}.mp4`);
    const key = `videos/${videoId}/${safeName}`;

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
        storageProvider: process.env.STORAGE_PROVIDER_VIDEO ?? 's3',
        storageBucket: bucket,
        storageKey: key,
        publicUrl,
        status: VideoAssetStatus.READY,
      }),
    );

    return {
      media_asset_id: saved.id,
      filename: saved.originalFilename,
      status: saved.status,
    };
  }

  // 1. Create presigned upload URL
  async createPresignedUpload(dto: CreateVideoUploadDto, user?: { userId?: string }) {
    this.validateVideoMime(dto.mime_type);

    const maxSize = Number(process.env.VIDEO_MAX_SIZE_BYTES ?? 2 * 1024 * 1024 * 1024); // 2GB

    if (dto.size_bytes > maxSize) {
      throw new BadRequestException('file size exceeds limit');
    }

    const storage = this.storageFactory.video();
    const videoId = randomUUID();
    const safeName = this.sanitizeFilename(dto.original_filename ?? `${videoId}.mp4`);
    const key = `videos/${videoId}/${safeName}`;

    // Create presigned PUT URL (client will PUT file to this key)
    const uploadUrl = await storage.presignPut!(
      storage.bucket,
      key,
      dto.mime_type,
      60 * 15, // 15 minutes
    );

    // Save DB record with UPLOADING status
    const asset = this.repo.create({
      ownerUserId: Number(user?.userId ?? 0),
      originalFilename: dto.original_filename ?? safeName,
      mimeType: dto.mime_type,
      sizeBytes: String(dto.size_bytes),
      storageProvider: process.env.STORAGE_PROVIDER_VIDEO ?? 's3',
      storageBucket: storage.bucket,
      storageKey: key,
      status: VideoAssetStatus.UPLOADING,
    });

    const saved = await this.repo.save(asset);

    return {
      media_asset_id: saved.id,
      filename: saved.originalFilename,
      upload_url: uploadUrl,
      storage_key: key,
      expires_in: 900,
    };
  }

  // 2. Confirm upload completed
  async confirmUpload(mediaAssetId: number) {
    const asset = await this.repo.findOne({ where: { id: mediaAssetId } });

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

  // 3. Get presigned view URL
  async getPresignedViewUrl(id: number) {
    const asset = await this.repo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('video asset not found');

    const storage = this.storageFactory.video();
    const bucket = asset.storageBucket ?? storage.bucket;
    const key = asset.storageKey;

    if (!key) throw new NotFoundException('video file not found');

    // Get presigned GET URL (AwsService provides presignGet / presignedGetObject)
    const presignGet = (storage as any).presignGet ?? (storage as any).presignedGetObject;
    if (!presignGet || typeof presignGet !== 'function') {
      throw new BadRequestException('presign GET not supported by storage provider');
    }

    const expiresSeconds = Number(process.env.PRESIGN_EXPIRES_SECONDS); // 7 days
    const presignedUrl = await presignGet.call(storage, bucket, key, expiresSeconds);

    return {
      media_asset_id: asset.id,
      original_filename: asset.originalFilename,
      presigned_url: presignedUrl,
      expires_in: expiresSeconds,
      mime_type: asset.mimeType,
      storage_key: asset.storageKey,
    };
  }

  // 4. Delete video by ID
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

  // Validate video mime type
  private validateVideoMime(mimeType: string) {
    const allow = (
      process.env.VIDEO_MIME_ALLOWLIST ?? 'video/mp4,video/webm,video/quicktime,application/octet-stream'
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
