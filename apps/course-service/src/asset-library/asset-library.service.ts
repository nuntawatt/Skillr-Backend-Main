import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { AwsS3StorageService } from '../storage/aws.service';
import { AssetImageAsset, AssetImageStatus } from './entities/asset-image.entity';
import { AssetVideoAsset, AssetVideoStatus } from './entities/asset-video.entity';
import { CreateAssetVideoDto } from './dto/create-asset-video.dto';

@Injectable()
export class AssetLibraryService {
  constructor(
    private readonly aws: AwsS3StorageService,
    @InjectRepository(AssetImageAsset)
    private readonly imageRepo: Repository<AssetImageAsset>,
    @InjectRepository(AssetVideoAsset)
    private readonly videoRepo: Repository<AssetVideoAsset>,
  ) {}

  private validateImageMime(mime: string, originalName?: string) {
    const ext = (originalName ?? '').split('.').pop()?.toLowerCase();
    const allowMime = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/pjpeg',
      'image/webp',
      'image/svg+xml',
    ];
    const allowExt = ['jpg', 'jpeg', 'png', 'webp', 'svg'];

    if (allowMime.includes((mime ?? '').toLowerCase())) return;
    if ((mime === 'application/octet-stream' || !mime) && ext && allowExt.includes(ext)) return;

    throw new BadRequestException('invalid image mime type');
  }

  private validateVideoMime(mimeType: string, originalFilename?: string) {
    const normalizedMime = (mimeType ?? '').trim().toLowerCase();

    const allowMimes = (
      process.env.VIDEO_MIME_ALLOWLIST ??
      'video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,video/mpeg,application/octet-stream'
    )
      .split(',')
      .map((x) => x.trim().toLowerCase());

    if (allowMimes.includes(normalizedMime)) return;

    const allowExt = (process.env.VIDEO_EXT_ALLOWLIST ?? 'mp4,webm,mov,avi,mkv,mpeg,mpg')
      .split(',')
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);

    const ext = (originalFilename ?? '').split('.').pop()?.toLowerCase();
    if ((normalizedMime === 'application/octet-stream' || !normalizedMime) && ext && allowExt.includes(ext)) {
      return;
    }

    throw new BadRequestException(`mime type not allowed: ${mimeType}`);
  }

  async uploadAssetImage(adminId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('file missing');

    this.validateImageMime(file.mimetype, file.originalname);

    const maxSize = Number(process.env.ASSET_IMAGE_MAX_SIZE_BYTES ?? 30 * 1024 * 1024);
    if (file.size > maxSize) {
      throw new BadRequestException('file too large');
    }

    const bucket = process.env.ASSET_IMAGE_BUCKET ?? 'asset_image';
    const uuid = randomUUID();
    const storageKey = `images/${uuid}`;

    await this.aws.putObject(bucket, storageKey, file.buffer, file.size, file.mimetype);

    const publicUrl = this.aws.buildPublicUrl(bucket, storageKey);

    const saved = await this.imageRepo.save(
      this.imageRepo.create({
        adminId,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: String(file.size),
        storageProvider: 's3',
        storageBucket: bucket,
        storageKey,
        publicUrl,
        status: AssetImageStatus.READY,
      }),
    );

    return {
      asset_image_id: saved.id,
      url: saved.publicUrl,
      status: saved.status,
    };
  }

  async createAssetVideoPresign(adminId: string, dto: CreateAssetVideoDto) {
    this.validateVideoMime(dto.mime_type, dto.original_filename);

    const maxSize = Number(process.env.ASSET_VIDEO_MAX_SIZE_BYTES) || 1 * 1024 * 1024 * 1024;
    if (dto.size_bytes > maxSize) {
      throw new BadRequestException('file size exceeds limit');
    }

    const bucket = process.env.ASSET_VIDEO_BUCKET ?? 'asset_video';
    const uuid = randomUUID();
    const storageKey = `videos/${uuid}`;

    const uploadUrl = await this.aws.presignPut(bucket, storageKey, dto.mime_type, 60 * 15);

    const saved = await this.videoRepo.save(
      this.videoRepo.create({
        adminId,
        originalFilename: dto.original_filename ?? uuid,
        mimeType: dto.mime_type,
        sizeBytes: String(dto.size_bytes),
        storageProvider: 's3',
        storageBucket: bucket,
        storageKey,
        publicUrl: this.aws.buildPublicUrl(bucket, storageKey),
        status: AssetVideoStatus.UPLOADING,
      }),
    );

    return {
      asset_video_id: saved.id,
      upload_url: uploadUrl,
      public_url: saved.publicUrl,
      status: saved.status,
    };
  }

  async confirmAssetVideo(id: number) {
    const asset = await this.videoRepo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('asset video not found');

    const exists = await this.aws.fileExists(asset.storageBucket, asset.storageKey);
    if (!exists) throw new BadRequestException('file not uploaded yet');

    asset.status = AssetVideoStatus.READY;
    asset.publicUrl = asset.publicUrl ?? this.aws.buildPublicUrl(asset.storageBucket, asset.storageKey);
    await this.videoRepo.save(asset);

    return {
      success: true,
      asset_video_id: asset.id,
      public_url: asset.publicUrl,
      status: asset.status,
    };
  }
}
