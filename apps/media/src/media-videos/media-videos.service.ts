import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { StorageService } from '../storage/storage.service';
import { VideoAsset, VideoAssetStatus } from './entities/video-asset.entity';
import { CreateVideoUploadDto } from './dto/create-video-upload.dto';
import type { Response } from 'express';

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as ffmpegPath from '@ffmpeg-installer/ffmpeg';
import { Readable } from 'stream';
import ffmpeg from 'fluent-ffmpeg';

interface VideoResolution {
  name: string;
  resolution: string;
  bitrate: string;
}

export interface VideoVersion {
  quality: string;
  presignPath: string; // relative path returned to frontend: <uuid>/<quality>/video.mp4
  presigned?: string;
}

@Injectable()
export class MediaVideosService {
  private readonly logger = new Logger(MediaVideosService.name);
  private readonly resolutions: VideoResolution[];

  constructor(
    private readonly storage: StorageService,
    @InjectRepository(VideoAsset)
    private readonly repo: Repository<VideoAsset>,
  ) {
    // set ffmpeg binary path
    ffmpeg.setFfmpegPath(ffmpegPath.path);

    this.resolutions = this.parseResolutions();
  }

  private parseResolutions(): VideoResolution[] {
    const raw = process.env.VIDEO_RESOLUTIONS;
    if (!raw) {
      throw new Error('VIDEO_RESOLUTIONS is not configured');
    }

    return raw.split(',').map((item) => {
      const [name, resolution, bitrate] = item.split(':');
      return {
        name: (name ?? '').trim(),
        resolution: (resolution ?? '').trim(),
        bitrate: (bitrate ?? '').trim(),
      };
    });
  }

  // process video buffer to target resolution and bitrate
  private async processVideo(
    inputBuffer: Buffer,
    resolution: string,
    bitrate: string,
  ): Promise<Buffer> {
    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `in-${randomUUID()}`);
    const outputPath = path.join(tmpDir, `out-${randomUUID()}.mp4`);

    // 1. write buffer to temp input file
    await fs.writeFile(inputPath, inputBuffer);

    try {
      // 2. run ffmpeg
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .inputOptions('-nostdin')
          .videoCodec('libx264')
          .size(resolution)
          .videoBitrate(bitrate)
          .audioCodec('aac')
          .audioBitrate('128k')
          .format('mp4')
          .outputOptions([
            '-movflags', 'frag_keyframe+empty_moov',
            '-preset', 'veryfast',
            '-threads', '1',
          ])
          .on('end', resolve)
          .on('error', reject)
          .save(outputPath);
      });

      // 3. read output file
      return await fs.readFile(outputPath);
    } finally {
      // 4. cleanup temp files (always)
      await Promise.allSettled([
        fs.unlink(inputPath).catch(() => { }),
        fs.unlink(outputPath).catch(() => { }),
      ]);
    }
  }



  // validate mime type for video uploads
  private validateVideoMime(mimeType: string) {
    if (!mimeType || typeof mimeType !== 'string') {
      throw new BadRequestException('mime_type missing or invalid');
    }

    if (!mimeType.startsWith('video/')) {
      throw new BadRequestException('file is not a video');
    }

    const allow = (process.env.VIDEO_MIME_ALLOWLIST ??
      'video/mp4,video/webm,video/quicktime,video/x-matroska,video/x-msvideo,video/x-flv,video/x-ms-wmv,video/mpeg,video/3gpp'
    )
      .split(',')
      .map((x) => x.trim().toLowerCase());

    if (!allow.includes(mimeType.trim().toLowerCase())) {
      throw new BadRequestException('mime_type is not allowed');
    }
  }

  // create video upload entry and return upload info
  async createVideoUpload(
    dto: CreateVideoUploadDto,
    requestUser: { sub?: any } | undefined,
  ) {
    this.validateVideoMime(dto.mime_type);

    const maxSizeBytes = Number(
      process.env.VIDEO_MAX_SIZE_BYTES ?? String(2 * 1024 * 1024 * 1024),
    );
    if (dto.size_bytes > maxSizeBytes)
      throw new BadRequestException('size_bytes exceeds limit');

    const bucket = this.storage.bucket;
    const keyPrefix = process.env.S3_VIDEO_KEY_PREFIX ?? 'videos';
    const videoId = randomUUID();
    const folderKey = `${keyPrefix}/${videoId}`;

    // Optional placeholder: if you want a visible "folder" in some UIs, create `.keep` inside folder.
    // Not required for S3/MinIO to work. If you don't want it, you can remove the following call.
    try {
      await this.storage.putObject(bucket, `${folderKey}/.keep`, Buffer.alloc(0), 0);
    } catch (e) {
      // ignore putObject errors for placeholder
      this.logger.debug(`Could not create keep file: ${String(e)}`);
    }

    // create and persist entity
    const asset = new VideoAsset();
    asset.ownerUserId = Number(requestUser?.sub ?? 0);
    asset.originalFilename = dto.original_filename;
    asset.mimeType = dto.mime_type;
    asset.sizeBytes = String(dto.size_bytes);
    asset.storageProvider = process.env.STORAGE_PROVIDER ?? 'minio';
    asset.storageBucket = bucket;
    asset.storageKey = folderKey; // IMPORTANT: store folder path, not a filename
    asset.status = VideoAssetStatus.UPLOADING;

    const saved = await this.repo.save(asset);
    return { media_asset_id: saved.id };
  }

  // upload video file, transcode, and persist metadata
  async uploadVideoFileAndPersist(
    file: Express.Multer.File,
    requestUser: { sub?: number } | undefined,
    mediaAssetId?: number,
    ownerUserIdFromBody?: number,
  ) {
    if (!file) throw new BadRequestException('file missing');

    // fetch existing asset if mediaAssetId provided
    let asset: VideoAsset | null = null;
    if (mediaAssetId !== undefined && Number.isFinite(mediaAssetId)) {
      asset = await this.repo.findOne({ where: { id: Number(mediaAssetId) } });
      if (!asset) throw new NotFoundException('media asset not found');
      if (asset.status !== VideoAssetStatus.UPLOADING)
        throw new BadRequestException('invalid state');
    }

    const mime = file.mimetype ?? '';
    this.validateVideoMime(mime);

    const maxSizeBytes = Number(
      process.env.VIDEO_MAX_SIZE_BYTES ?? String(2 * 1024 * 1024 * 1024),
    );
    if (file.size > maxSizeBytes) throw new BadRequestException('file too large');

    const bucket = this.storage.bucket;
    const keyPrefix = process.env.S3_VIDEO_KEY_PREFIX ?? 'videos';

    // Determine folderPath:
    // - if asset exists, use asset.storageKey (must be videos/<uuid>)
    // - otherwise create a new uuid and folder
    let folderPath: string;
    let uuidSegment: string;
    if (asset && asset.storageKey) {
      folderPath = asset.storageKey;
      const parts = folderPath.split('/');
      uuidSegment = parts.length >= 2 ? parts[1] : randomUUID();
    } else {
      uuidSegment = randomUUID();
      folderPath = `${keyPrefix}/${uuidSegment}`;
    }

    // store different versions
    const versions: VideoVersion[] = [];

    // If transcoding is disabled or fails, upload original as fallback
    const enableTranscode = process.env.ENABLE_VIDEO_TRANSCODE !== 'false';

    if (!enableTranscode) {
      this.logger.log('Video transcoding is disabled, uploading original only');
      const originalKey = `${folderPath}/original/video.mp4`;

      await this.storage.putObject(bucket, originalKey, file.buffer, file.size, { 'Content-Type': mime });

      let presigned: string | undefined;
      try {
        presigned = await this.storage.presignedGetObject(bucket, originalKey, 3600);
      } catch {
        presigned = undefined;
      }

      versions.push({
        quality: 'original',
        presignPath: `${uuidSegment}/original/video.mp4`,
        presigned,
      });
    } else {
      // loop through configured resolutions and transcode
      for (const r of this.resolutions) {
        try {
          this.logger.log(`Transcoding to ${r.name} (${r.resolution})`);
          const processed = await this.processVideo(file.buffer, r.resolution, r.bitrate);

          // store processed video
          const presignedKey = `${folderPath}/${r.name}.mp4`;

          await this.storage.putObject(bucket, presignedKey, processed, processed.length, { 'Content-Type': 'video/mp4' });

          let presigned: string | undefined;
          try {
            presigned = await this.storage.presignedGetObject(bucket, presignedKey, 3600);
          } catch {
            presigned = undefined;
          }

          versions.push({
            quality: r.name,
            presignPath: `${uuidSegment}/${r.name}.mp4`,
            presigned,
          });
        } catch (e) {
          this.logger.warn(`Transcode failed for ${r.name}: ${String(e)}`);
          // continue other resolutions
        }
      }

      // If all transcoding failed, upload original as fallback
      if (versions.length === 0) {
        this.logger.warn('All transcoding failed, uploading original as fallback');
        const originalKey = `${folderPath}/original/video.mp4`;
        await this.storage.putObject(bucket, originalKey, file.buffer, file.size, { 'Content-Type': mime });

        let presigned: string | undefined;
        try {
          presigned = await this.storage.presignedGetObject(bucket, originalKey, 3600);
        } catch {
          presigned = undefined;
        }

        versions.push({
          quality: 'original',
          presignPath: `${uuidSegment}/original.mp4`,
          presigned,
        });
      }
    }

    // Determine publicUrl (optional). Choosing first available version as public sample.
    const firstVersion = versions[0];
    let publicUrl: string | undefined;
    if (firstVersion) {
      // buildPublicUrl expects bucket + key
      const firstKeyOnStorage = `${folderPath}/${firstVersion.quality}/video.mp4`;
      publicUrl = this.storage.buildPublicUrl(bucket, firstKeyOnStorage);
    } else {
      publicUrl = undefined;
    }

    // set owner
    const ownerUserId = requestUser ? Number(requestUser.sub ?? 0) : Number(ownerUserIdFromBody ?? 0);

    // create or update entity safely using explicit assignment
    if (!asset) {
      asset = new VideoAsset();
      asset.ownerUserId = ownerUserId;
      asset.status = VideoAssetStatus.UPLOADING;
    }

    asset.originalFilename = file.originalname;
    asset.mimeType = mime;
    asset.sizeBytes = String(file.size);
    asset.storageProvider = process.env.STORAGE_PROVIDER ?? 'minio';
    asset.storageBucket = bucket;
    asset.storageKey = folderPath;  // Store folder path as key (videos/<uuid>)
    asset.publicUrl = publicUrl;
    asset.status = VideoAssetStatus.READY;

    const saved = await this.repo.save(asset);

    return {
      media_asset_id: saved.id,
      storage_key: folderPath,
      versions,
    };
  }


  // stream object with support for range requests
  private async streamObjectWithRange(
    bucket: string,
    objectKey: string,
    res: Response,
    mimeType: string,
    size?: number,
  ) {
    res.setHeader('Accept-Ranges', 'bytes');

    const range = res.req.headers.range as string | undefined;
    if (!size || !range) {
      const stream = await this.storage.getObject(bucket, objectKey);
      res.setHeader('Content-Type', mimeType);
      if (size) res.setHeader('Content-Length', String(size));
      stream.pipe(res);
      return;
    }

    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (!match) return res.status(416).end();

    const start = Number(match[1] || 0);
    const end = match[2] ? Number(match[2]) : Math.min(start + 1024 * 1024, (size ?? 0) - 1);

    if (isNaN(start) || isNaN(end) || start >= (size ?? 0) || start > end) return res.status(416).end();

    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
    res.setHeader('Content-Length', String(end - start + 1));
    res.setHeader('Content-Type', mimeType);

    const stream = await this.storage.getPartialObject(bucket, objectKey, start, end - start + 1);
    stream.pipe(res);
  }

  async streamObjectByKey(key: string, res: Response) {
    const bucket = this.storage.bucket;
    const objectKey = key.startsWith('videos/') ? key : `videos/${key}`;

    // Try to locate asset by folder (videos/<uuid>) if exact file not in DB
    const asset = await this.repo.findOne({ where: { storageBucket: bucket, storageKey: objectKey } })
      || await (async () => {
        const parts = objectKey.split('/');
        if (parts.length >= 2) {
          const folder = `${parts[0]}/${parts[1]}`; // videos/<uuid>
          return this.repo.findOne({ where: { storageBucket: bucket, storageKey: folder } });
        }
        return null;
      })();

    if (!asset) throw new NotFoundException('video not found');

    // get size if available
    const size = asset.sizeBytes ? Number(asset.sizeBytes) : undefined;
    return this.streamObjectWithRange(bucket, objectKey, res, asset.mimeType ?? 'video/mp4', size);
  }

  // generate presigned URL for a video file
  async getPresignedUrl(key: string, quality: string) {
    const bucket = this.storage.bucket;
    const keyPrefix = process.env.S3_VIDEO_KEY_PREFIX ?? 'videos';

    if (!key || !quality) {
      throw new BadRequestException('key and quality are required');
    }

    // path: videos/<uuid>/<quality>.mp4
    const objectKey = `${keyPrefix}/${key}/${quality}`;

    try {
      const presignedUrl =
        await this.storage.presignedGetObject(bucket, objectKey, 3600);

      return {
        key,
        quality,
        storageKey: objectKey,
        presignedUrl,
      };
    } catch (e) {
      this.logger.error(
        `Presign failed for ${objectKey}: ${String(e)}`,
      );
      throw new NotFoundException('video file not found');
    }
  }


  // delete video by id
  async deleteVideoById(id: number) {
    const asset = await this.repo.findOne({ where: { id } });
    if (!asset) {
      throw new NotFoundException('video asset not found');
    }

    const bucket = asset.storageBucket ?? this.storage.bucket;
    const folder = asset.storageKey;

    if (bucket && folder) {
      // Delete expected files under the folder:
      // videos/<uuid>/<quality>/video.mp4 and videos/<uuid>/original/video.mp4
      const keysToDelete: string[] = [];

      // known quality folders from configuration
      for (const r of this.resolutions) {
        keysToDelete.push(`${folder}/${r.name}/video.mp4`);
      }
      // original + keep
      keysToDelete.push(`${folder}/original/video.mp4`);
      keysToDelete.push(`${folder}/.keep`);

      for (const k of keysToDelete) {
        try {
          await this.storage.removeObject(bucket, k);
        } catch (err) {
          this.logger.warn(`Failed to remove ${bucket}/${k}: ${String(err)}`);
        }
      }
    }

    await this.repo.remove(asset);
    return { deleted: true };
  }

  // cleanup deleted assets video
  async cleanupDeleteAsset(id: number) {
    const asset = await this.repo.findOne({ where: { id } });
    if (!asset) return { deleted: false };

    const bucket = asset.storageBucket ?? this.storage.bucket;
    const folder = asset.storageKey;

    if (bucket && folder) {
      const keysToDelete: string[] = [];
      for (const r of this.resolutions) {
        keysToDelete.push(`${folder}/${r.name}/video.mp4`);
      }
      keysToDelete.push(`${folder}/original/video.mp4`);
      keysToDelete.push(`${folder}/.keep`);

      for (const k of keysToDelete) {
        try { await this.storage.removeObject(bucket, k); } catch { }
      }
    }

    await this.repo.remove(asset);
    return { deleted: true };
  }
}