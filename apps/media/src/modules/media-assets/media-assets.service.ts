import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import path from 'path';
import * as Minio from 'minio';
import type { AuthUser } from '@auth';
import type { Response } from 'express';
import { fileTypeFromBuffer } from 'file-type';
import { MediaAsset, MediaAssetStatus, MediaAssetType } from './entities/media-asset.entity';
import { CreateVideoUploadDto } from './dto/create-video-upload.dto';

@Injectable()
export class MediaAssetsService {
  remove(arg0: number) {
    throw new Error('Method not implemented.');
  }
  private readonly s3: Minio.Client;

  private getObjectStream(
    bucket: string,
    objectKey: string,
  ): Promise<NodeJS.ReadableStream> {
    return new Promise((resolve, reject) => {
      this.s3.getObject(bucket, objectKey, (err, stream) => {
        if (err || !stream) {
          reject(err ?? new Error('No object stream'));
          return;
        }
        resolve(stream);
      });
    });
  }

  private getPartialObjectStream(
    bucket: string,
    objectKey: string,
    start: number,
    length: number,
  ): Promise<NodeJS.ReadableStream> {
    return new Promise((resolve, reject) => {
      this.s3.getPartialObject(
        bucket,
        objectKey,
        start,
        length,
        (err, stream) => {
          if (err || !stream) {
            reject(err ?? new Error('No partial object stream'));
            return;
          }
          resolve(stream);
        },
      );
    });
  }

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(MediaAsset)
    private readonly mediaAssetsRepository: Repository<MediaAsset>,
  ) {
    const { endPoint, port, useSSL, accessKey, secretKey } = this.getMinioConnectionConfig();

    this.s3 = new Minio.Client({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey
    });
  }

  private getMinioConnectionConfig(): {
    endPoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
  } {

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

  private async detectVideoMimeOrThrow(file: Express.Multer.File): Promise<string> {
    const allowedMimes = new Set([
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime',
      'video/x-msvideo', // AVI
      'video/avi',
    ]);
    if (allowedMimes.has(file.mimetype)) {
      return file.mimetype;
    }

    // 2. เช็คจาก magic bytes (file signature)
    const ft = await fileTypeFromBuffer(file.buffer);
    if (ft && ft.mime.startsWith('video/')) {
      return ft.mime;
    }

    // 3. fallback จากนามสกุลไฟล์
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.avi') return 'video/x-msvideo';
    if (ext === '.mp4') return 'video/mp4';
    if (ext === '.mov') return 'video/quicktime';
    if (ext === '.webm') return 'video/webm';

    throw new BadRequestException('unsupported video format');
  }

  async uploadVideoFileAndPersist(
    file: Express.Multer.File,
    requestUser: AuthUser | undefined,
    mediaAssetId?: number,
    ownerUserIdFromBody?: number,
  ) {

    // Validate mime type and permissions
    if (requestUser) {
      this.assertAdmin(requestUser);
    }
    const detectedMime = await this.detectVideoMimeOrThrow(file);

    const maxSizeBytes = Number(
      this.configService.get<string>('VIDEO_MAX_SIZE_BYTES') ??
      String(2 * 1024 * 1024 * 1024)
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
      if (asset.status !== MediaAssetStatus.UPLOADING) {
        throw new ConflictException('invalid state');
      }
    }

    const objectKey = asset?.storageKey ?? `videos/${randomUUID()}`;

    await this.s3.putObject(bucket, objectKey, file.buffer, file.size, {
      'Content-Type': detectedMime,
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
        mimeType: detectedMime,
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
      key: key,
      storage_key: objectKey,
      public_url: saved.publicUrl,
    };
  }

  private buildPublicUrl(bucket: string, objectKey: string,): string | undefined {
    const baseRaw =
      this.configService.get<string>('S3_PUBLIC_BASE_URL') ??
      this.configService.get<string>('S3_ENDPOINT');

    const base = baseRaw ? baseRaw.trim().split(/\s+/)[0] : undefined;
    if (!base) return undefined;

    const normalizedBase = base.replace(/\/$/, '');
    const normalizedKey = objectKey.replace(/^\//, '');
    return `${normalizedBase}/${bucket}/${normalizedKey}`;
  }

  async uploadImageFileAndPersist(
    file: Express.Multer.File,
    ownerUserIdFromBody?: number,
  ) {
    // Validate mime type
    const mime = (file.mimetype ?? '').toLowerCase();
    const allow = (
      this.configService.get<string>('IMAGE_MIME_ALLOWLIST') ?? 'image/png,image/jpeg,image/jpg'
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
    const key = randomUUID();
    const objectKey = `${keyPrefix}/${key}`;

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
      key,
      storage_key: objectKey,
      public_url: saved.publicUrl,
    };
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

  async deleteAssetIfExists(id: number): Promise<{ deleted: boolean }> {
    const asset = await this.mediaAssetsRepository.findOne({ where: { id } });
    if (!asset) return { deleted: false };

    const bucket = asset.storageBucket ?? this.getBucketOrThrow();
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
    // Check if user is admin 
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
      this.configService.get<string>('VIDEO_MIME_ALLOWLIST') ?? 'video/mp4,video/webm,video/quicktime').split(',');

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

    // Return the media asset ID for the client to use during upload
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

  private async streamObject(bucket: string, objectKey: string, res: Response, mimeType?: string, sizeBytes?: number) {
    try {
      const dataStream = await this.getObjectStream(bucket, objectKey);
      if (mimeType) res.setHeader('Content-Type', mimeType);
      if (sizeBytes && Number.isFinite(sizeBytes)) res.setHeader('Content-Length', String(sizeBytes));

      await new Promise<void>((resolve, reject) => {
        dataStream.on('error', (e) => {
          try { res.end(); } catch { }
          reject(e);
        });
        dataStream.on('end', () => resolve());
        try {
          dataStream.pipe(res);
        } catch (e) {
          reject(e as Error);
        }
      });

    } catch (e) {
      throw new NotFoundException('object not found');
    }
  }

  async streamImageByKey(key: string, res: Response) {
    const bucket = this.getBucketOrThrow();
    const objectKey = key.startsWith('images/') ? key : `images/${key}`;

    const asset = await this.mediaAssetsRepository.findOne({
      where: { storageBucket: bucket, storageKey: objectKey, type: MediaAssetType.IMAGE }
    });

    if (!asset) {
      throw new NotFoundException('image not found');
    }
    if (!asset.storageKey) {
      throw new BadRequestException('asset has no storage key');
    }

    const mime = asset.mimeType ?? 'image/jpeg';
    const size = asset.sizeBytes ? Number(asset.sizeBytes) : undefined;

    return this.streamObject(bucket, asset.storageKey, res, mime, size);
  }

  private async streamObjectWithRange(
    bucket: string,
    objectKey: string,
    res: Response,
    mimeType: string,
    size?: number,
    range?: string,
  ) {
    res.setHeader('Accept-Ranges', 'bytes');

    if (!size || !range) {
      const stream = await this.getObjectStream(bucket, objectKey);
      res.setHeader('Content-Type', mimeType);
      if (size) res.setHeader('Content-Length', String(size));
      stream.pipe(res);
      return;
    }

    // ===== parse Range =====
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (!match) {
      res.status(416).end();
      return;
    }

    let start: number;
    let end: number;

    if (match[1] === '' && match[2]) {
      // bytes=-500
      const suffix = Number(match[2]);
      if (isNaN(suffix)) {
        res.status(416).end();
        return;
      }
      start = Math.max(size - suffix, 0);
      end = size - 1;
    } else {
      start = Number(match[1]);
      end = match[2]
        ? Number(match[2])
        : Math.min(start + 1024 * 1024, size - 1);
    }

    if (
      isNaN(start) ||
      isNaN(end) ||
      start < 0 ||
      start >= size ||
      start > end
    ) {
      res.status(416).end();
      return;
    }

    const chunkSize = end - start + 1;

    // ===== response headers =====
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
    res.setHeader('Content-Length', String(chunkSize));
    res.setHeader('Content-Type', mimeType);

    const stream = await this.getPartialObjectStream(
      bucket,
      objectKey,
      start,
      chunkSize,
    );

    stream.pipe(res);
  }


  async streamObjectByKey(key: string, res: Response) {
    const bucket = this.getBucketOrThrow();
    const objectKey = key.startsWith('videos/') ? key : `videos/${key}`;

    const asset = await this.mediaAssetsRepository.findOne({
      where: { storageBucket: bucket, storageKey: objectKey },
    });

    if (!asset) {
      throw new NotFoundException('video not found');
    }

    const mime = asset.mimeType ?? 'video/mp4';
    const size = asset.sizeBytes ? Number(asset.sizeBytes) : undefined;

    const range = res.req.headers.range as string | undefined;

    return this.streamObjectWithRange(
      bucket,
      objectKey,
      res,
      mime,
      size,
      range
    );
  }
}