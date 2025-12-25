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
import * as Minio from 'minio';
import type { AuthUser } from '@auth';
import type { Response } from 'express';

import { MediaAsset, MediaAssetStatus, MediaAssetType, } from './entities/media-asset.entity';
import { CreateVideoUploadDto } from './dto/create-video-upload.dto';

@Injectable()
export class MediaAssetsService {
  getVideoPlaybackInfo(arg0: number) {
    throw new Error('Method not implemented.');
  }
  getVideoInfo(arg0: number) {
    throw new Error('Method not implemented.');
  }
  
  private readonly s3: Minio.Client;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(MediaAsset)
    private readonly mediaAssetsRepository: Repository<MediaAsset>,
  ) {
    const { endPoint, port, useSSL, accessKey, secretKey } =
      this.getMinioConnectionConfig();

    this.s3 = new Minio.Client({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });
  }

  private getMinioConnectionConfig(): {
    endPoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
  } {
    // IMPORTANT: the host used for presigned URLs must be reachable by the client.
    // For LAN usage, set it to something like 10.3.1.88 (not localhost).
    const endpointRaw = this.configService.get<string>('S3_ENDPOINT');
    const explicitHost = this.configService.get<string>('MINIO_ENDPOINT');
    const explicitPort = this.configService.get<string>('MINIO_PORT');
    const explicitUseSsl = this.configService.get<string>('MINIO_USE_SSL');

    let endPoint = explicitHost ?? 'localhost';
    let port = explicitPort ? Number(explicitPort) : 9000;
    let useSSL = explicitUseSsl ? explicitUseSsl === 'true' : false;

    const endpoint = endpointRaw
      ? endpointRaw.trim().split(/\s+/)[0]
      : undefined;

    if (endpoint) {
      try {
        const url = new URL(endpoint);
        endPoint = url.hostname;
        if (url.port) port = Number(url.port);
        useSSL = url.protocol === 'https:';
      } catch {
        // If S3_ENDPOINT is not a URL, treat it as a hostname.
        endPoint = endpoint;
      }
    }

    const accessKey =
      this.configService.get<string>('S3_ACCESS_KEY_ID') ??
      this.configService.get<string>('MINIO_ACCESS_KEY') ??
      '';
    const secretKey =
      this.configService.get<string>('S3_SECRET_ACCESS_KEY') ??
      this.configService.get<string>('MINIO_SECRET_KEY') ??
      '';

    if (!accessKey || !secretKey) {
      throw new BadRequestException('MinIO credentials are not configured');
    }

    return { endPoint, port, useSSL, accessKey, secretKey };
  }

  async uploadVideoFileAndPersist(
    file: Express.Multer.File,
    requestUser: AuthUser | undefined,
    mediaAssetId?: number,
    ownerUserIdFromBody?: number,
  ) {
    // NOTE: temporarily allow public upload (no login required)
    // If requestUser exists, keep the admin check. Otherwise allow.
    if (requestUser) {
      this.assertAdmin(requestUser);
    }
    this.validateVideoMime(file.mimetype);

    const maxSizeBytes = Number(
      this.configService.get<string>('VIDEO_MAX_SIZE_BYTES') ??
      String(2 * 1024 * 1024 * 1024),
    );
    if (file.size > maxSizeBytes) {
      throw new BadRequestException('file size exceeds limit');
    }

    const bucket = this.getBucketOrThrow();
    let asset: MediaAsset | undefined;

    if (mediaAssetId !== undefined && Number.isFinite(mediaAssetId)) {
      asset = await this.getAssetOrThrow(Number(mediaAssetId));
      if (asset.type !== MediaAssetType.VIDEO) {
        throw new BadRequestException('media asset is not a video');
      }
      // Allow upload only for upload state assets.
      if (asset.status !== MediaAssetStatus.UPLOADING) {
        throw new ConflictException('invalid state');
      }
    }

    const objectKey = asset?.storageKey ?? `videos/${randomUUID()}`;

    await this.s3.putObject(bucket, objectKey, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });

    const ownerUserId = requestUser
      ? this.getUserIdOrZero(requestUser)
      : Number(ownerUserIdFromBody ?? 0);
    const publicUrl = this.buildPublicUrl(bucket, objectKey);

    const saved = await this.mediaAssetsRepository.save(
      this.mediaAssetsRepository.create({
        ...(asset?.id ? { id: asset.id } : {}),
        ownerUserId: asset?.ownerUserId ?? ownerUserId,
        type: MediaAssetType.VIDEO,
        status: MediaAssetStatus.READY,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: String(file.size),
        storageProvider:
          this.configService.get<string>('STORAGE_PROVIDER') ?? 'minio',
        storageBucket: bucket,
        storageKey: objectKey,
        publicUrl,
      }),
    );

    const key = objectKey.startsWith('videos/')
      ? objectKey.slice('videos/'.length)
      : objectKey;

    return {
      media_asset_id: saved.id,
      key,
      storage_key: objectKey,
      public_url: saved.publicUrl,
    };
  }

  async uploadImageFileAndPersist(
    file: Express.Multer.File,
    ownerUserIdFromBody?: number,
  ) {
    // Allow public upload for now (no requestUser parameter here)
    const mime = (file.mimetype ?? '').toLowerCase();
    const allow = (
      this.configService.get<string>('IMAGE_MIME_ALLOWLIST') ??
      'image/png,image/jpeg,image/jpg'
    ).split(',').map((s) => s.trim().toLowerCase());
    if (!allow.includes(mime)) {
      throw new BadRequestException('image mime_type is not allowed');
    }

    const maxSizeBytes = Number(
      this.configService.get<string>('IMAGE_MAX_SIZE_BYTES') ?? String(5 * 1024 * 1024),
    );
    if (file.size > maxSizeBytes) {
      throw new BadRequestException('file size exceeds limit');
    }

    const bucket = this.getBucketOrThrow();
    const keyPrefix = this.configService.get<string>('S3_IMAGE_KEY_PREFIX') ?? 'images';
    const objectKey = `${keyPrefix}/${randomUUID()}`;

    await this.s3.putObject(bucket, objectKey, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });

    const ownerUserId = Number(ownerUserIdFromBody ?? 0);
    const publicUrl = this.buildPublicUrl(bucket, objectKey);

    const saved = await this.mediaAssetsRepository.save(
      this.mediaAssetsRepository.create({
        ownerUserId,
        type: MediaAssetType.IMAGE,
        status: MediaAssetStatus.READY,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: String(file.size),
        storageProvider: this.configService.get<string>('STORAGE_PROVIDER') ?? 'minio',
        storageBucket: bucket,
        storageKey: objectKey,
        publicUrl,
      }),
    );

    return {
      media_asset_id: saved.id,
      storage_key: objectKey,
      public_url: saved.publicUrl,
    };
  }

  async getVideoFileUrl(key: string) {
    const bucket = this.getBucketOrThrow();
    const dir = `videos/${key}`;

    const expiresIn = Number(
      this.configService.get<string>('S3_SIGNED_URL_EXPIRES_SECONDS') ?? '900',
    );
    return this.s3.presignedGetObject(bucket, dir, expiresIn);
  }

  async getVideoUrlByMediaAssetId(mediaAssetId: number) {
    const asset = await this.getAssetOrThrow(mediaAssetId);
    if (asset.type !== MediaAssetType.VIDEO) {
      throw new BadRequestException('media asset is not a video');
    }
    if (asset.status !== MediaAssetStatus.READY) {
      throw new ConflictException('media asset is not ready');
    }
    if (!asset.storageKey) {
      throw new BadRequestException('storage_key is missing');
    }

    // storageKey is expected to be like "videos/<uuid>" or similar
    const bucket = asset.storageBucket ?? this.getBucketOrThrow();
    const expiresIn = Number(
      this.configService.get<string>('S3_SIGNED_URL_EXPIRES_SECONDS') ?? '900',
    );
    const objectKey = asset.storageKey;
    return this.s3.presignedGetObject(bucket, objectKey, expiresIn);
  }

  async getImageUrlByMediaAssetId(mediaAssetId: number) {
    const asset = await this.getAssetOrThrow(mediaAssetId);
    if (asset.type !== MediaAssetType.IMAGE) {
      throw new BadRequestException('media asset is not an image');
    }
    if (asset.status !== MediaAssetStatus.READY) {
      throw new ConflictException('media asset is not ready');
    }
    if (!asset.storageKey) {
      throw new BadRequestException('storage_key is missing');
    }

    const bucket = asset.storageBucket ?? this.getBucketOrThrow();
    const expiresIn = Number(
      this.configService.get<string>('S3_SIGNED_URL_EXPIRES_SECONDS') ?? '900',
    );
    return this.s3.presignedGetObject(bucket, asset.storageKey, expiresIn);
  }

  async getPublicAssetStatus(id: number) {
    const asset = await this.getAssetOrThrow(id);
    return {
      id: asset.id,
      type: asset.type,
      status: asset.status,
      created_at: asset.createdAt,
      updated_at: asset.updatedAt,
    };
  }

  async deleteAssetIfExists(id: number): Promise<{ deleted: boolean }> {
    const asset = await this.mediaAssetsRepository.findOne({ where: { id } });
    if (!asset) return { deleted: false };

    // Best-effort object deletion.
    const bucket = asset.storageBucket;
    const key = asset.storageKey;
    if (bucket && key) {
      try {
        await this.s3.removeObject(bucket, key);
      } catch {
        // ignore
      }
    }

    await this.mediaAssetsRepository.remove(asset);
    return { deleted: true };
  }

  private getBucketOrThrow(): string {
    const bucket = this.configService.get<string>('S3_BUCKET');
    if (!bucket) {
      throw new BadRequestException('S3_BUCKET is not configured');
    }
    return bucket;
  }

  private assertAdmin(user: AuthUser) {
    // JwtAuthGuard + RolesGuard should handle this already.
    // This is just a hard-stop safety check.
    const role = String(user?.role ?? '').toLowerCase();
    if (role !== 'admin') {
      throw new ForbiddenException();
    }
  }


  private getUserIdOrZero(user: AuthUser): number {
    const raw = user.sub ?? user.id;
    const n = typeof raw === 'string' ? Number(raw) : raw;
    return Number.isFinite(n) ? Number(n) : 0;
  }


  private validateVideoMime(mimeType: string) {
    const allow = (
      this.configService.get<string>('VIDEO_MIME_ALLOWLIST') ??
      'video/mp4,video/webm,video/quicktime'
    ).split(',');
    const normalized = mimeType.trim().toLowerCase();
    if (!allow.map((x) => x.trim().toLowerCase()).includes(normalized)) {
      throw new BadRequestException('mime_type is not allowed');
    }
  }

  
  async createVideoUpload(dto: CreateVideoUploadDto, requestUser: AuthUser) {
    this.assertAdmin(requestUser);
    this.validateVideoMime(dto.mime_type);

    const maxSizeBytes = Number(
      this.configService.get<string>('VIDEO_MAX_SIZE_BYTES') ??
      String(2 * 1024 * 1024 * 1024),
    );
    if (dto.size_bytes > maxSizeBytes) {
      throw new BadRequestException('size_bytes exceeds limit');
    }

    const bucket = this.getBucketOrThrow();
    const keyPrefix =
      this.configService.get<string>('S3_VIDEO_KEY_PREFIX') ?? 'videos';
    const key = `${keyPrefix}/${randomUUID()}`;

    const asset = this.mediaAssetsRepository.create({
      ownerUserId: this.getUserIdOrZero(requestUser),
      type: MediaAssetType.VIDEO,
      status: MediaAssetStatus.UPLOADING,
      originalFilename: dto.original_filename,
      mimeType: dto.mime_type,
      sizeBytes: String(dto.size_bytes),
      storageProvider:
        this.configService.get<string>('STORAGE_PROVIDER') ?? 's3',
      storageBucket: bucket,
      storageKey: key,

    });
    const saved = await this.mediaAssetsRepository.save(asset);

    // NOTE: current flow for uploads is handled via /media/videos/upload (multipart).
    return { media_asset_id: saved.id };
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
      public_url: asset.publicUrl,
      created_at: asset.createdAt,
      updated_at: asset.updatedAt,
    };
  }

  private buildPublicUrl(
    bucket: string,
    objectKey: string,
  ): string | undefined {
    const baseRaw =
      this.configService.get<string>('S3_PUBLIC_BASE_URL') ??
      this.configService.get<string>('S3_ENDPOINT');

    const base = baseRaw ? baseRaw.trim().split(/\s+/)[0] : undefined;
    if (!base) return undefined;

    const normalizedBase = base.replace(/\/$/, '');
    const normalizedKey = objectKey.replace(/^\//, '');
    return `${normalizedBase}/${bucket}/${normalizedKey}`;
  }

  // Stream an object by media asset id through the API response.
  async streamObjectByMediaAssetId(id: number, res: Response) {
    const asset = await this.getAssetOrThrow(id);
    if (!asset.storageBucket || !asset.storageKey) {
      throw new BadRequestException('asset has no storage info');
    }
    const mime = asset.mimeType ?? 'application/octet-stream';
    const size = asset.sizeBytes ? Number(asset.sizeBytes) : undefined;
    return this.streamObject(asset.storageBucket, asset.storageKey, res, mime, size);
  }

  // Stream an object by key (for videos where key may be provided without the prefix).
  async streamObjectByKey(key: string, res: Response) {
    const bucket = this.getBucketOrThrow();
    const objectKey = key.startsWith('videos/') ? key : `videos/${key}`;
    let mime = 'application/octet-stream';
    let size: number | undefined = undefined;
    try {
      const maybe = await this.mediaAssetsRepository.findOne({ where: { storageBucket: bucket, storageKey: objectKey } });
      if (maybe) {
        mime = maybe.mimeType ?? mime;
        size = maybe.sizeBytes ? Number(maybe.sizeBytes) : undefined;
      }
    } catch {
      // ignore
    }
    return this.streamObject(bucket, objectKey, res, mime, size);
  }

  private async streamObject(bucket: string, objectKey: string, res: Response, mimeType?: string, sizeBytes?: number) {
    try {
      // Recent minio client returns a Promise<ReadableStream> for getObject.
      const dataStream: NodeJS.ReadableStream = await (this.s3 as any).getObject(bucket, objectKey);
      if (mimeType) res.setHeader('Content-Type', mimeType);
      if (sizeBytes && Number.isFinite(sizeBytes)) res.setHeader('Content-Length', String(sizeBytes));

      await new Promise<void>((resolve, reject) => {
        dataStream.on('error', (e) => {
          try { res.end(); } catch {}
          reject(e);
        });
        dataStream.on('end', () => resolve());
        try {
          (dataStream as any).pipe(res);
        } catch (e) {
          reject(e as Error);
        }
      });
    } catch (e) {
      throw new NotFoundException('object not found');
    }
  }
}
