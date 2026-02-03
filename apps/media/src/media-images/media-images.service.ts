import { InjectRepository } from '@nestjs/typeorm';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { StorageFactory } from '../storage/storage.factory';
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
    const allowMime = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/pjpeg',
      'image/webp',
    ];
    const allowExt = ['jpg', 'jpeg', 'png', 'webp'];

    if (allowMime.includes((mime ?? '').toLowerCase())) return;
    if (
      (mime === 'application/octet-stream' || !mime) &&
      ext &&
      allowExt.includes(ext)
    )
      return;

    throw new BadRequestException('invalid image mime type');
  }

  // ===== Upload image =====
  async uploadImageFileAndPersist(
    file: Express.Multer.File,
    ownerUserId?: number,
  ) {
    if (!file) throw new BadRequestException('file missing');

    this.validateImageMime(file.mimetype, file.originalname);

    const maxSize = Number(process.env.IMAGE_MAX_SIZE_BYTES ?? 5 * 1024 * 1024);
    if (file.size > maxSize) {
      throw new BadRequestException('file too large');
    }

    const storage = this.storageFactory.image();
    const bucket = storage.bucket;

    // สร้าง storage key แบบ unique (คุณสามารถเปลี่ยน structure ได้)
    const uuid = randomUUID();
    const storageKey = `images/${uuid}${(file.originalname?.match(/\.[^.]+$/) ?? [''])[0]}`;

    // upload ผ่าน storage abstraction
    await storage.putObject(bucket, storageKey, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });

    // บันทึก metadata ลง DB
    const saved = await this.repo.save(
      this.repo.create({
        ownerUserId: Number(ownerUserId ?? 0),
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: String(file.size),

        storageProvider: process.env.STORAGE_PROVIDER ?? 'local',
        storageBucket: bucket,
        storageKey,
        status: ImageAssetStatus.READY,
      }),
    );

    return {
      image_id: saved.id,
      storage_key: storageKey,
      status: saved.status,
    };
  }

  // ===== Get presigned by id =====
  async getPresignedImageById(id: number) {
    const asset = await this.repo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('image asset not found');

    const storage = this.storageFactory.image();
    const bucket = storage.bucket;
    const expires = Number(process.env.PRESIGN_EXPIRES_SECONDS ?? 3600);

    // สร้าง response headers เพื่อให้ browser แสดง inline แทนดาวน์โหลด
    const responseHeaders = {
      // S3/MinIO รับ parameter ชื่อแบบนี้ (จะถูก encode เป็น query params)
      'response-content-type': asset.mimeType,
      'response-content-disposition': 'inline',
    };

    const url = await storage.presignedGetObject(
      bucket,
      asset.storageKey,
      expires,
      responseHeaders,
    );

    return {
      presignedUrl: url,
      expires_in: expires,
    };
  }

  // ===== Delete =====
  async deleteImageById(id: number) {
    const asset = await this.repo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('media asset not found');

    const storage = this.storageFactory.image();
    await storage.deleteObject(asset.storageBucket, asset.storageKey);

    await this.repo.remove(asset);
    return { deleted: true };
  }
}
