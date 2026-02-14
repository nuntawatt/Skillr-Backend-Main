import { InjectRepository } from '@nestjs/typeorm';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
  ) { }

  // ตรวจสอบ MIME type ของไฟล์ภาพที่อัพโหลดเข้ามา (รองรับ jpg/jpeg/png/webp)
  private validateImageMime(mime: string, originalName?: string) {
    const ext = (originalName ?? '').split('.').pop()?.toLowerCase();
    const allowMime = ['image/jpeg', 'image/png', 'image/jpg', 'image/pjpeg', 'image/webp'];
    const allowExt = ['jpg', 'jpeg', 'png', 'webp'];

    if (allowMime.includes((mime ?? '').toLowerCase())) return;
    if ((mime === 'application/octet-stream' || !mime) && ext && allowExt.includes(ext)) return;

    throw new BadRequestException('invalid image mime type');
  }

  // อัพโหลดไฟล์ภาพผ่าน form-data (รองรับขนาดสูงสุด 5MB) และบันทึก metadata ลง DB
  async uploadImageFileAndPersist(file: Express.Multer.File, ownerUserId?: number) {
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

    // อัพโหลดไฟล์ไปยัง storage provider s3 หรือตามที่คุณตั้งค่าไว้
    await storage.putObject(
      bucket,
      storageKey,
      file.buffer,
      file.size,
      { 'Content-Type': file.mimetype },
    );

    // สร้าง URL สาธารณะสำหรับเข้าถึงไฟล์ผ่าน CloudFront หรือ storage provider อื่น
    const publicUrl = storage.buildPublicUrl(bucket, storageKey);

    // บันทึก metadata ลง DB
    const saved = await this.repo.save(
      this.repo.create({
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: String(file.size),
        storageProvider: 's3',
        storageBucket: bucket,
        storageKey,
        publicUrl,
        status: ImageAssetStatus.READY,
      }),
    );

    return {
      image_id: saved.id,
      url: saved.publicUrl,
      status: saved.status,
    };
  }

  // ดึง URL สาธารณะของภาพโดยใช้ ID (จะดึงจาก DB หรือสร้างจาก storage key ก็ได้)
  async getPublicUrlById(id: number) {
    const asset = await this.repo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('image asset not found');

    // ถ้า publicUrl มีอยู่แล้วก็ใช้เลย ถ้าไม่ก็สร้างจาก storage key (กรณีที่คุณไม่ได้บันทึก publicUrl ไว้ตอนอัพโหลด)
    const url = asset.publicUrl ?? this.storageFactory.image().buildPublicUrl(asset.storageBucket, asset.storageKey);

    return {
      image_id: asset.id,
      url,
      mime_type: asset.mimeType,
    };
  }


  // Delete image by ID (ลบทั้ง metadata ใน DB และไฟล์ใน storage)
  async deleteImageById(id: number) {
    const asset = await this.repo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('media asset not found');

    const storage = this.storageFactory.image();
    await storage.deleteObject(asset.storageBucket, asset.storageKey);

    await this.repo.remove(asset);
    return { deleted: true };
  }
}
