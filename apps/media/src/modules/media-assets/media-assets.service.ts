import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import {
  MediaAsset,
  MediaAssetStatus,
  MediaAssetType,
} from './entities/media-asset.entity';
import { CreateVideoUploadDto } from './dto/create-video-upload.dto';
import { CompleteVideoUploadDto } from './dto/complete-video-upload.dto';

@Injectable()
export class MediaAssetsService {
  private readonly s3: S3Client;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(MediaAsset)
    private readonly mediaAssetsRepository: Repository<MediaAsset>,
  ) {
    const region = this.configService.get<string>('S3_REGION') ?? 'us-east-1';
    const endpoint = this.configService.get<string>('S3_ENDPOINT');

    this.s3 = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.configService.get<string>('S3_ACCESS_KEY_ID') ?? '',
        secretAccessKey: this.configService.get<string>('S3_SECRET_ACCESS_KEY') ?? '',
      },
    });
  }

  private getBucketOrThrow(): string {
    const bucket = this.configService.get<string>('S3_BUCKET');
    if (!bucket) {
      throw new BadRequestException('S3_BUCKET is not configured');
    }
    return bucket;
  }

  private assertAdmin(user: any) {
    // JwtAuthGuard + RolesGuard should handle this already.
    // This is just a hard-stop safety check.
    const role = String(user?.role ?? '').toLowerCase();
    if (role !== 'admin') {
      throw new ForbiddenException();
    }
  }

  private validateVideoMime(mimeType: string) {
    const allow = (this.configService.get<string>('VIDEO_MIME_ALLOWLIST') ??
      'video/mp4,video/webm,video/quicktime').split(',');
    const normalized = mimeType.trim().toLowerCase();
    if (!allow.map((x) => x.trim().toLowerCase()).includes(normalized)) {
      throw new BadRequestException('mime_type is not allowed');
    }
  }

  async createVideoUpload(dto: CreateVideoUploadDto, requestUser: any) {
    this.assertAdmin(requestUser);
    this.validateVideoMime(dto.mime_type);

    const maxSizeBytes = Number(this.configService.get<string>('VIDEO_MAX_SIZE_BYTES') ?? String(2 * 1024 * 1024 * 1024));
    if (dto.size_bytes > maxSizeBytes) {
      throw new BadRequestException('size_bytes exceeds limit');
    }

    const bucket = this.getBucketOrThrow();
    const keyPrefix = this.configService.get<string>('S3_VIDEO_KEY_PREFIX') ?? 'videos';
    const key = `${keyPrefix}/${randomUUID()}`;

    const asset = this.mediaAssetsRepository.create({
      ownerUserId: Number(requestUser?.sub ?? requestUser?.id),
      type: MediaAssetType.VIDEO,
      status: MediaAssetStatus.UPLOADING,
      originalFilename: dto.original_filename,
      mimeType: dto.mime_type,
      sizeBytes: String(dto.size_bytes),
      storageProvider: this.configService.get<string>('STORAGE_PROVIDER') ?? 's3',
      storageBucket: bucket,
      storageKey: key,
    });

    const saved = await this.mediaAssetsRepository.save(asset);

    const expiresIn = Number(this.configService.get<string>('S3_SIGNED_URL_EXPIRES_SECONDS') ?? '900');
    const uploadUrl = await getSignedUrl(
      this.s3,
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: dto.mime_type,
      }),
      { expiresIn },
    );

    return {
      mediaAssetId: saved.id,
      uploadUrl,
    };
  }

  async getAssetOrThrow(id: number) {
    const asset = await this.mediaAssetsRepository.findOne({ where: { id } });
    if (!asset) {
      throw new NotFoundException('media asset not found');
    }
    return asset;
  }

  async getAsset(id: number) {
    const asset = await this.getAssetOrThrow(id);
    return {
      id: asset.id,
      owner_user_id: asset.ownerUserId,
      type: asset.type,
      status: asset.status,
      original_filename: asset.originalFilename,
      mime_type: asset.mimeType,
      size_bytes: asset.sizeBytes ? Number(asset.sizeBytes) : undefined,
      storage_provider: asset.storageProvider,
      storage_bucket: asset.storageBucket,
      storage_key: asset.storageKey,
      created_at: asset.createdAt,
      updated_at: asset.updatedAt,
    };
  }

  async completeVideoUploadByMediaAssetId(
    mediaAssetId: number,
    dto: CompleteVideoUploadDto,
    requestUser: any,
  ) {
    this.assertAdmin(requestUser);

    const asset = await this.getAssetOrThrow(mediaAssetId);

    if (asset.type !== MediaAssetType.VIDEO) {
      throw new BadRequestException('media asset is not a video');
    }

    if (asset.status !== MediaAssetStatus.UPLOADING) {
      throw new ConflictException('invalid state');
    }

    const bucket = asset.storageBucket ?? this.getBucketOrThrow();
    const key = asset.storageKey;
    if (!key) {
      throw new BadRequestException('storage_key is missing');
    }

    const head = await this.s3.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    const expected = dto.expected_size_bytes ?? (asset.sizeBytes ? Number(asset.sizeBytes) : undefined);
    if (expected && head.ContentLength !== undefined && Number(head.ContentLength) !== Number(expected)) {
      asset.status = MediaAssetStatus.FAILED;
      await this.mediaAssetsRepository.save(asset);
      throw new ConflictException('upload size mismatch');
    }

    asset.status = MediaAssetStatus.READY;
    await this.mediaAssetsRepository.save(asset);

    return {
      mediaAssetId: asset.id,
      status: asset.status,
    };
  }
}
