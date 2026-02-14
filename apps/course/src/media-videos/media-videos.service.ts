import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { StorageFactory } from '../storage/storage.factory';
import { VideoAsset, VideoAssetStatus } from './entities/video-asset.entity';
import { CreateVideoUploadDto } from './dto/create-video-upload.dto';
import { AwsS3StorageService } from '../storage/aws.service';

@Injectable()
export class MediaVideosService {
  private readonly logger = new Logger(MediaVideosService.name);

  constructor(
    private readonly storageFactory: StorageFactory,
    @InjectRepository(VideoAsset)
    private readonly repo: Repository<VideoAsset>,
    private readonly aws: AwsS3StorageService
  ) { }

  // เรียกดูนามสกุลไฟล์จากชื่อไฟล์ (ถ้ามี) เพื่อใช้ในการตั้งชื่อไฟล์ใน S3
  private getFileExtension(filename: string | undefined): string | null {
    if (!filename) return null;
    const match = filename.match(/\.([^.]+)$/); // ดึงนามสกุลจากชื่อไฟล์ (เช่น "video.mp4" → "mp4")
    return match ? match[1].toLowerCase() : null;
  }

  // อัพโหลดไฟล์วิดีโอผ่าน form-data (สำหรับไฟล์ขนาดเล็ก - สูงสุด 500MB)
  async uploadVideoFileAndPersist(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('file missing');
    this.validateVideoMime(file.mimetype ?? '');

    const maxSize = Number(process.env.VIDEO_MAX_SIZE_BYTES ?? String(500 * 1024 * 1024)); // 500MB for form upload
    if (file.size > maxSize) throw new BadRequestException('file size exceeds limit');

    const storage = this.storageFactory.video();
    const bucket = storage.bucket;
    const videoId = randomUUID();
    const ext = this.getFileExtension(file.originalname) || 'mp4';
    const key = `videos/${videoId}.${ext}`;

    // Upload to storage
    await storage.putObject(bucket, key, file.buffer, file.size, { 'Content-Type': file.mimetype });

    const publicUrl = typeof storage.buildPublicUrl === 'function' ? storage.buildPublicUrl(bucket, key) : undefined;

    const saved = await this.repo.save(
      this.repo.create({
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: String(file.size),
        storageProvider: 's3',
        storageBucket: bucket,
        storageKey: key,
        publicUrl,
        status: VideoAssetStatus.READY,
      }),
    );

    return {
      video_id: saved.id,
      url: saved.publicUrl,
      status: saved.status,
    };
  }

  // 1. สร้าง presigned upload URL สำหรับอัพโหลดวิดีโอ (สำหรับไฟล์ขนาดใหญ่ - สูงสุด 2GB)
  async createPresignedUpload(dto: CreateVideoUploadDto, user?: { sub?: number }) {
    this.validateVideoMime(dto.mime_type);

    const maxSize = Number(process.env.VIDEO_MAX_SIZE_BYTES ?? 2 * 1024 * 1024 * 1024); // 2GB

    if (dto.size_bytes > maxSize) {
      throw new BadRequestException('file size exceeds limit');
    }

    const storage = this.storageFactory.video();
    const videoId = randomUUID();
    const ext = this.getFileExtension(dto.original_filename) || 'mp4';
    const key = `videos/${videoId}.${ext}`;

    // สร้าง presigned PUT URL (client จะ PUT ไฟล์ไปยัง key นี้)
    const uploadUrl = await storage.presignPut!(
      storage.bucket,
      key,
      dto.mime_type,
      60 * 15, // 15 minutes
    );

    // บันทึก metadata ลง DB ในสถานะ "uploading" (เราจะอัพเดตเป็น "ready" ผ่าน Lambda หรือกระบวนการอื่นเมื่อไฟล์ถูกอัพโหลดสำเร็จ)
    const asset = this.repo.create({
      originalFilename: dto.original_filename ?? `${videoId}.${ext}`,
      mimeType: dto.mime_type,
      sizeBytes: String(dto.size_bytes),
      storageProvider: 's3',
      storageBucket: storage.bucket,
      storageKey: key,
      status: VideoAssetStatus.UPLOADING,
    });

    const saved = await this.repo.save(asset);

    return {
      video_id: saved.id,
      // filename: saved.originalFilename,
      // upload_url: uploadUrl,
      url: storage.buildPublicUrl(storage.bucket, key),
      // storage_key: key,
      expires_in: 900,
    };
  }

  // 2. Get public view URL
  async getPublicViewUrl(id: number) {
    const asset = await this.repo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('video asset not found');

    // Return stored public URL, or build it from storage key
    const url = asset.publicUrl ?? this.storageFactory.video().buildPublicUrl(
      asset.storageBucket ?? this.storageFactory.video().bucket,
      asset.storageKey!,
    );

    return {
      video_id: asset.id,
      // original_filename: asset.originalFilename,
      url,
      mime_type: asset.mimeType,
    };
  }

  // 3. Delete video by ID
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
    return { deleted: true, video_id: id };
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
