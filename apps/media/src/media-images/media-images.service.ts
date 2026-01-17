import { InjectRepository } from '@nestjs/typeorm';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { StorageFactory } from '../storage/storage.factory';
import { UploadImageDto } from './dto/upload-image.dto';
import { ImageAsset, ImageAssetStatus } from './entities/image-asset.entity';

@Injectable()
export class MediaImagesService {
  constructor(
    private readonly storageFactory: StorageFactory,
    @InjectRepository(ImageAsset)
    private readonly repo: Repository<ImageAsset>,
  ) {}

  private validateImageMime(mime: string, originalName?: string) {
    const ext = (originalName ?? '').split('.').pop()?.toLowerCase();
    const allowMime = ['image/jpeg', 'image/png', 'image/jpg', 'image/pjpeg'];
    const allowExt = ['jpg', 'jpeg', 'png'];

    if (allowMime.includes((mime ?? '').toLowerCase())) return;
    if ((mime === 'application/octet-stream' || !mime) && ext && allowExt.includes(ext)) return;

    throw new BadRequestException('invalid image mime type');
  }

  // server-side upload (unchanged logic) but use storageFactory abstraction
  async uploadImageFileAndPersist(file: Express.Multer.File, ownerUserIdFromBody?: number) {
    if (!file) throw new BadRequestException('file missing');
    this.validateImageMime(file.mimetype ?? '', file.originalname);

    const maxSize = Number(process.env.IMAGE_MAX_SIZE_BYTES ?? String(5 * 1024 * 1024));
    if (file.size > maxSize) throw new BadRequestException('file size exceeds limit');

    const storage = this.storageFactory.image(); // <-- use factory (MinIO or other)
    const bucket = storage.bucket;
    const keyPrefix = process.env.S3_IMAGE_KEY_PREFIX ?? 'images';
    const key = `${keyPrefix}/${randomUUID()}`;

    // putObject: providers should implement this
    await storage.putObject(bucket, key, file.buffer, file.size, { 'Content-Type': file.mimetype });

    const ownerUserId = Number(ownerUserIdFromBody ?? 0);
    const publicUrl = typeof storage.buildPublicUrl === 'function' ? storage.buildPublicUrl(bucket, key) : undefined;

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

  // create presigned PUT + DB placeholder so client can upload directly
  // NOTE: provider must implement presignPut; otherwise this will error (we check)
  async createPresignedUpload(
    dto: { original_filename: string; content_type: string; size_bytes?: number },
    ownerUserIdFromBody?: number,
  ) {
    this.validateImageMime(dto.content_type, dto.original_filename);

    const maxSize = Number(process.env.IMAGE_MAX_SIZE_BYTES ?? String(5 * 1024 * 1024));
    if (dto.size_bytes && dto.size_bytes > maxSize) throw new BadRequestException('file size exceeds limit');

    const storage = this.storageFactory.image();
    const bucket = storage.bucket;
    const keyPrefix = process.env.S3_IMAGE_KEY_PREFIX ?? 'images';
    const uuid = randomUUID();
    const key = `${keyPrefix}/${uuid}`;

    // create DB placeholder asset with UPLOADING status
    const asset = this.repo.create({
      ownerUserId: Number(ownerUserIdFromBody ?? 0),
      originalFilename: dto.original_filename,
      mimeType: dto.content_type,
      sizeBytes: dto.size_bytes ? String(dto.size_bytes) : undefined,
      storageProvider: process.env.STORAGE_PROVIDER ?? 'minio',
      storageBucket: bucket,
      storageKey: key,
      publicUrl: undefined,
      status: ImageAssetStatus.UPLOADING,
    });

    const saved = await this.repo.save(asset);

    // ensure provider supports presignPut
    const presignFn = (storage as any).presignPut ?? (storage as any).presignedPutObject ?? null;
    if (!presignFn || typeof presignFn !== 'function') {
      // fallback: return upload key and client must POST to server upload endpoint
      return {
        media_asset_id: saved.id,
        storage_key: key,
        presigned: null,
        note: 'presign not supported by storage provider; use server-side upload to /media/images/upload or implement presignPut in provider',
      };
    }

    // call presign (provider may have different name; we attempt both)
    // args: bucket, key, contentType, expiresSeconds
    const expires = Number(process.env.PRESIGN_EXPIRES_SECONDS ?? 60 * 15);
    let presignedUrl: string;
    try {
      // unify calling signature: try presignPut(bucket,key,contentType,expires) first
      if ((storage as any).presignPut && typeof (storage as any).presignPut === 'function') {
        presignedUrl = await (storage as any).presignPut(bucket, key, dto.content_type, expires);
      } else {
        // MinIO client wrapper might expose presignedPutObject(bucket,key,expires)
        // or the storage wrapper may have presignedPutObject(bucket,key,expires)
        presignedUrl = await (storage as any).presignedPutObject(bucket, key, expires);
      }
    } catch (err) {
      // if presign fails, return placeholder response and let client fallback
      return {
        media_asset_id: saved.id,
        storage_key: key,
        presigned: null,
        error: String(err),
      };
    }

    return {
      media_asset_id: saved.id,
      storage_key: key,
      presigned: presignedUrl,
      expires_in: expires,
    };
  }

  async getPresignedImageByKey(key: string) {
    const storage = this.storageFactory.image();
    const bucket = storage.bucket;
    const keyPrefix = process.env.S3_IMAGE_KEY_PREFIX ?? 'images';
    if (!key) throw new BadRequestException('key is required');

    const objectKey = `${keyPrefix}/${key}`;

    const asset = await this.repo.findOne({
      where: {
        storageBucket: bucket,
        storageKey: objectKey,
      },
    });

    if (!asset) throw new NotFoundException('image not found');

    try {
      // use whichever presigned GET the provider exposes:
      const presignGet = (storage as any).presignGet ?? (storage as any).presignedGetObject ?? (storage as any).presignedGet;
      if (!presignGet || typeof presignGet !== 'function') {
        throw new Error('presign GET not supported by provider');
      }
      const url = await presignGet(bucket, objectKey, Number(process.env.PRESIGN_EXPIRES_SECONDS ?? 3600));
      return { presignedUrl: url };
    } catch (e) {
      throw new NotFoundException('image file not found');
    }
  }

  async deleteImageById(id: number) {
    const asset = await this.repo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('media asset not found');

    const storage = this.storageFactory.image();
    const bucket = asset.storageBucket ?? storage.bucket;
    const key = asset.storageKey;
    if (bucket && key) {
      try {
        await storage.deleteObject(bucket, key);
      } catch (err) {
        // optional log
      }
    }
    await this.repo.remove(asset);
    return { deleted: true };
  }

  async cleanupDeleteAsset(id: number) {
    const asset = await this.repo.findOne({ where: { id } });
    if (!asset) return { deleted: false };
    const storage = this.storageFactory.image();
    const bucket = asset.storageBucket ?? storage.bucket;
    const key = asset.storageKey;
    if (bucket && key) {
      try {
        await storage.deleteObject(bucket, key);
      } catch { }
    }
    await this.repo.remove(asset);
    return { deleted: true };
  }
}
