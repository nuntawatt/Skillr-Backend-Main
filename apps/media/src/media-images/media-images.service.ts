import { InjectRepository } from '@nestjs/typeorm';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import type { Response } from 'express';
import { StorageService } from '../storage/storage.service';
import { ImageAsset, ImageAssetStatus } from './entities/image-asset.entity';

@Injectable()
export class MediaImagesService {
  constructor(
    private readonly storage: StorageService,
    @InjectRepository(ImageAsset)
    private readonly repo: Repository<ImageAsset>,
  ) { }

  private validateImageMime(mime: string) {
    const allow = (process.env.IMAGE_MIME_ALLOWLIST ?? 'image/png,image/jpeg,image/jpg')
      .split(',')
      .map((s) => s.trim().toLowerCase());
    if (!allow.includes((mime ?? '').toLowerCase())) {
      throw new BadRequestException('image mime_type is not allowed');
    }
  }

  async uploadImageFileAndPersist(file: Express.Multer.File, ownerUserIdFromBody?: number) {
    if (!file) throw new BadRequestException('file missing');
    this.validateImageMime(file.mimetype ?? '');

    const maxSize = Number(process.env.IMAGE_MAX_SIZE_BYTES ?? String(5 * 1024 * 1024));
    if (file.size > maxSize) throw new BadRequestException('file size exceeds limit');

    const bucket = this.storage.bucket;
    const keyPrefix = process.env.S3_IMAGE_KEY_PREFIX ?? 'images';
    const key = `${keyPrefix}/${randomUUID()}`;

    await this.storage.putObject(bucket, key, file.buffer, file.size, { 'Content-Type': file.mimetype });

    const ownerUserId = Number(ownerUserIdFromBody ?? 0);
    const publicUrl = this.storage.buildPublicUrl(bucket, key);

    const saved = await this.repo.save(
      this.repo.create({
        ownerUserId,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: String(file.size),
        storageProvider: process.env.STORAGE_PROVIDER ?? 'minio',
        storageBucket: bucket,
        storageKey: key,
        publicUrl,
        status: ImageAssetStatus.READY,
      }),
    );

    return {
      media_asset_id: saved.id,
      key: key.split('/').pop(),
      storage_key: key,
      public_url: saved.publicUrl,
    };
  }

  async getPresignedImageByKey(key: string) {
    const bucket = this.storage.bucket;
    const keyPrefix = process.env.S3_IMAGE_KEY_PREFIX ?? 'images';

    if (!key) {
      throw new BadRequestException('key is required');
    }

    // Path construction
    const objectKey = `${keyPrefix}/${key}`;

    // (Recommended) Check DB first to prevent key guessing
    const asset = await this.repo.findOne({
      where: {
        storageBucket: bucket,
        storageKey: objectKey,
      },
    });

    if (!asset) {
      throw new NotFoundException('image not found');
    }

    try {
      const presignedUrl =
        await this.storage.presignedGetObject(bucket, objectKey, 3600);

      return { presignedUrl };
    } catch (e) {
      throw new NotFoundException('image file not found');
    }
  }

  async deleteImageById(id: number) {
    const asset = await this.repo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('media asset not found');

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

  // cleanup deleted assets images
  async cleanupDeleteAsset(id: number) {
    const asset = await this.repo.findOne({ where: { id } });
    if (!asset) return { deleted: false };
    const bucket = asset.storageBucket ?? this.storage.bucket;
    const key = asset.storageKey;
    if (bucket && key) {
      try {
        await this.storage.removeObject(bucket, key);
      } catch { }
    }

    await this.repo.remove(asset);
    return { deleted: true };
  }
}
