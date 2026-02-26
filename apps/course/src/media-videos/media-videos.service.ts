import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { StorageFactory } from '../storage/storage.factory';
import { VideoAsset, VideoAssetStatus } from './entities/video-asset.entity';
import { CreateVideoUploadDto } from './dto/create-video-upload.dto';
import { CreateVideoPresignDto } from './dto/create-video-presign.dto';
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

  // อัพโหลดไฟล์วิดีโอผ่าน form-data (สำหรับไฟล์ขนาดเล็ก - สูงสุด 1GB)
  // async uploadVideoFileAndPersist(file: Express.Multer.File) {
  //   if (!file) throw new BadRequestException('file missing');
  //   this.validateVideoMime(file.mimetype ?? '');

  //   const maxSize = 1 * 1024 * 1024 * 1024; // 1GB for form upload
  //   if (file.size > maxSize) throw new BadRequestException('file size exceeds limit');

  //   const storage = this.storageFactory.video();
  //   const bucket = storage.bucket;
  //   const videoId = randomUUID();
  //   // const ext = this.getFileExtension(file.originalname) || 'mp4';
  //   const key = `videos/${videoId}`;

  //   // Upload to storage
  //   await storage.putObject(bucket, key, file.buffer, file.size, { 'Content-Type': file.mimetype });

  //   const publicUrl = typeof storage.buildPublicUrl === 'function' ? storage.buildPublicUrl(bucket, key) : undefined;

  //   const saved = await this.repo.save(
  //     this.repo.create({
  //       originalFilename: file.originalname,
  //       mimeType: file.mimetype,
  //       sizeBytes: String(file.size),
  //       storageProvider: 's3',
  //       storageBucket: bucket,
  //       storageKey: key,
  //       publicUrl,
  //       status: VideoAssetStatus.READY,
  //     }),
  //   );

  //   return {
  //     video_id: saved.id,
  //     url: saved.publicUrl,
  //     status: saved.status,
  //   };
  // }

  // 1. สร้าง presigned upload URL สำหรับอัพโหลดวิดีโอ (สำหรับไฟล์ขนาดใหญ่ - สูงสุด 1GB)
  async createPresignedUpload(dto: CreateVideoPresignDto) {
    this.validateVideoMime(dto.mime_type);

    const maxSize = Number(process.env.VIDEO_MAX_SIZE_BYTES) || 1 * 1024 * 1024 * 1024; // 1GB

    if (dto.size_bytes > maxSize) {
      throw new BadRequestException('file size exceeds limit');
    }

    const bucket = process.env.AWS_S3_BUCKET!;
    const videoId = randomUUID();
    const ext = this.getFileExtension(dto.original_filename) || 'mp4';
    const key = `videos/${videoId}.${ext}`;

    // generate presigned PUT URL (15 minutes)
    const uploadUrl = await this.aws.presignPut(bucket, key, dto.mime_type, 60 * 15);

    // save metadata with UPLOADING status
    const asset = this.repo.create({
      originalFilename: dto.original_filename ?? `${videoId}`,
      mimeType: dto.mime_type,
      sizeBytes: String(dto.size_bytes),
      storageProvider: 's3',
      storageBucket: bucket,
      storageKey: key,
      status: VideoAssetStatus.UPLOADING,
    });

    const saved = await this.repo.save(asset);

    return {
      video_id: saved.id,
      upload_url: uploadUrl,
      public_url: this.aws.buildPublicUrl(bucket, key),
    };
  }

  // Confirm uploaded file exists in S3 and update status to READY
  async confirmUpload(id: number) {
    const asset = await this.repo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('video asset not found');

    const bucket = asset.storageBucket!;
    const key = asset.storageKey!;

    const exists = await this.aws.fileExists(bucket, key);
    if (!exists) throw new BadRequestException('file not uploaded yet');

    asset.status = VideoAssetStatus.READY;
    const publicUrl = this.aws.buildPublicUrl(bucket, key);
    asset.publicUrl = publicUrl;
    await this.repo.save(asset);

    return {
      success: true,
      video_id: asset.id,
      public_url: publicUrl,
      // publicUrl: publicUrl,
      // url: publicUrl,
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
      url,
      public_url: url,
      // publicUrl: url,
      // mime_type: asset.mimeType,
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
