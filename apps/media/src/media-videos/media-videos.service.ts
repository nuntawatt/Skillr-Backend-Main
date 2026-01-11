import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Not, Repository } from 'typeorm';
import { StorageService } from '../storage/storage.service';
import { VideoAsset, VideoAssetStatus } from './entities/video-asset.entity';
import { CreateVideoUploadDto } from './dto/create-video-upload.dto';
import type { Response } from 'express';

@Injectable()
export class MediaVideosService {
  constructor(
    private readonly storage: StorageService,
    @InjectRepository(VideoAsset)
    private readonly repo: Repository<VideoAsset>,
  ) { }

  private validateVideoMime(mimeType: string) {
    const allow = (process.env.VIDEO_MIME_ALLOWLIST ?? 'video/mp4,video/webm,video/quicktime')
      .split(',')
      .map(x => x.trim().toLowerCase());
    if (!allow.includes(mimeType.trim().toLowerCase())) {
      throw new BadRequestException('mime_type is not allowed');
    }
  }

  async createVideoUpload(dto: CreateVideoUploadDto, requestUser: { sub?: any } | undefined) {
    this.validateVideoMime(dto.mime_type);
    const maxSizeBytes = Number(process.env.VIDEO_MAX_SIZE_BYTES ?? String(2 * 1024 * 1024 * 1024));
    if (dto.size_bytes > maxSizeBytes) throw new BadRequestException('size_bytes exceeds limit');

    const bucket = this.storage.bucket;
    const keyPrefix = process.env.S3_VIDEO_KEY_PREFIX ?? 'videos';
    const key = `${keyPrefix}/${randomUUID()}`;

    const asset = this.repo.create({
      ownerUserId: Number(requestUser?.sub ?? 0),
      originalFilename: dto.original_filename,
      mimeType: dto.mime_type,
      sizeBytes: String(dto.size_bytes),
      storageProvider: process.env.STORAGE_PROVIDER ?? 'minio',
      storageBucket: bucket,
      storageKey: key,
      status: VideoAssetStatus.UPLOADING,
    } as Partial<VideoAsset>);

    const saved = await this.repo.save(asset);
    return { media_asset_id: saved.id };
  }

  async uploadVideoFileAndPersist(file: Express.Multer.File, requestUser: { sub?: number } | undefined, mediaAssetId?: number, ownerUserIdFromBody?: number) {
    if (!file) throw new BadRequestException('file missing');

    // If provided an asset id, link to it
    let asset: VideoAsset | undefined;

    if (mediaAssetId !== undefined && Number.isFinite(mediaAssetId)) {
      const found = await this.repo.findOne({
        where: { id: Number(mediaAssetId) },
      });

      if (!found) {
        throw new NotFoundException('media asset not found');
      }

      if (found.status !== VideoAssetStatus.UPLOADING) {
        throw new BadRequestException('invalid state');
      }

      asset = found;
    }

    // basic mime check
    const mime = file.mimetype ?? '';
    this.validateVideoMime(mime);

    const maxSizeBytes = Number(process.env.VIDEO_MAX_SIZE_BYTES ?? String(2 * 1024 * 1024 * 1024));
    if (file.size > maxSizeBytes) throw new BadRequestException('file size exceeds limit');

    const bucket = this.storage.bucket;
    const objectKey = asset?.storageKey ?? `${process.env.S3_VIDEO_KEY_PREFIX ?? 'videos'}/${randomUUID()}`;
    await this.storage.putObject(bucket, objectKey, file.buffer, file.size, { 'Content-Type': mime });

    const ownerUserId = requestUser ? Number(requestUser.sub ?? 0) : Number(ownerUserIdFromBody ?? 0);
    const publicUrl = this.storage.buildPublicUrl(bucket, objectKey);

    const saved = await this.repo.save(
      this.repo.create({
        ...(asset?.id ? { id: asset.id } : {}),
        ownerUserId: asset?.ownerUserId ?? ownerUserId,
        originalFilename: file.originalname,
        mimeType: mime,
        sizeBytes: String(file.size),
        storageProvider: process.env.STORAGE_PROVIDER ?? 'minio',
        storageBucket: bucket,
        storageKey: objectKey,
        publicUrl,
        status: VideoAssetStatus.READY,
      }),
    );

    const key = objectKey.startsWith(`${process.env.S3_VIDEO_KEY_PREFIX ?? 'videos'}/`) ? objectKey.slice((process.env.S3_VIDEO_KEY_PREFIX ?? 'videos').length + 1) : objectKey;
    return {
      media_asset_id: saved.id,
      key,
      storage_key: objectKey,
      public_url: saved.publicUrl,
    };
  }

  private async streamObjectWithRange(bucket: string, objectKey: string, res: Response, mimeType: string, size?: number) {
    res.setHeader('Accept-Ranges', 'bytes');

    const range = res.req.headers.range as string | undefined;
    if (!size || !range) {
      const stream = await this.storage.getObject(bucket, objectKey);
      res.setHeader('Content-Type', mimeType);
      if (size) res.setHeader('Content-Length', String(size));
      stream.pipe(res);
      return;
    }

    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (!match) {
      res.status(416).end();
      return;
    }

    let start: number;
    let end: number;

    if (match[1] === '' && match[2]) {
      const suffix = Number(match[2]);
      if (isNaN(suffix)) { res.status(416).end(); return; }
      start = Math.max(size - suffix, 0);
      end = size - 1;
    } else {
      start = Number(match[1]);
      end = match[2] ? Number(match[2]) : Math.min(start + 1024 * 1024, size - 1);
    }

    if (isNaN(start) || isNaN(end) || start < 0 || start >= size || start > end) {
      res.status(416).end();
      return;
    }

    const chunkSize = end - start + 1;
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
    res.setHeader('Content-Length', String(chunkSize));
    res.setHeader('Content-Type', mimeType);

    const stream = await this.storage.getPartialObject(bucket, objectKey, start, chunkSize);
    stream.pipe(res);
  }

  async streamObjectByKey(key: string, res: Response) {
    const bucket = this.storage.bucket;
    const objectKey = key.startsWith('videos/') ? key : `videos/${key}`;
    const asset = await this.repo.findOne({ where: { storageBucket: bucket, storageKey: objectKey } });
    if (!asset) throw new NotFoundException('video not found');
    
    const mime = asset.mimeType ?? 'video/mp4';
    const size = asset.sizeBytes ? Number(asset.sizeBytes) : undefined;
    return this.streamObjectWithRange(bucket, objectKey, res, mime, size);
  }

  // delete video by id
  async deleteVideoById(id: number) {
    const asset = await this.repo.findOne({ where: { id } });
    if (!asset) {
      throw new NotFoundException('video asset not found');
    }

    const bucket = asset.storageBucket ?? this.storage.bucket;
    const key = asset.storageKey;
    if (bucket && key) {
      try {
        await this.storage.removeObject(bucket, key);
      } catch (err) {
        // optional log error
      }
    }

    await this.repo.remove(asset);
    return { deleted: true };
  }

  // cleanup deleted assets video 
  async cleanupDeleteAsset(id: number) {
    const asset = await this.repo.findOne({ where: { id } });
    if (!asset) return { deleted: false };

    const bucket = asset.storageBucket ?? this.storage.bucket;
    const key = asset.storageKey;
    if (bucket && key) {
      try { await this.storage.removeObject(bucket, key); } catch { }
    }
    await this.repo.remove(asset);
    return { deleted: true };
  }
}