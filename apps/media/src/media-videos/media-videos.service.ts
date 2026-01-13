import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { StorageService } from '../storage/storage.service';
import { VideoAsset, VideoAssetStatus } from './entities/video-asset.entity';
import { CreateVideoUploadDto } from './dto/create-video-upload.dto';
import type { Response } from 'express';

import ffmpeg from 'fluent-ffmpeg';
import * as ffmpegPath from '@ffmpeg-installer/ffmpeg';
import { Readable } from 'stream';

interface VideoResolution {
  name: string;
  resolution: string;
  bitrate: string;
}

export interface VideoVersion {
  quality: string;
  presignPath: string;
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

    // parse resolutions from env or default to 360p/720p/1080p
    this.resolutions = this.parseResolutions();
  }

  private parseResolutions(): VideoResolution[] {
    const raw =
      process.env.VIDEO_RESOLUTIONS ?? '360p:640x360:480k,720p:1280x720:1800k,1080p:1920x1080:4500k';

    return raw.split(',').map((item) => {
      const [name, resolution, bitrate] = item.split(':');
      return {
        name: (name ?? '').trim(),
        resolution: (resolution ?? '').trim(),
        bitrate: (bitrate ?? '').trim(),
      };
    });
  }

  /**
   * Transcode inputBuffer into a single mp4 buffer at given resolution/bitrate
   */
  private processVideo(
    inputBuffer: Buffer,
    resolution: string,
    bitrate: string,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const inputStream = Readable.from(inputBuffer);

      const command = ffmpeg()
        .input(inputStream)
        .inputOptions(['-nostdin'])
        .videoCodec('libx264')
        .size(resolution)
        .videoBitrate(bitrate)
        .audioCodec('aac')
        .audioBitrate('128k')
        .format('mp4')
        .outputOptions([
          '-movflags', 'frag_keyframe+empty_moov',
          '-preset', 'veryfast',
          'threds', '1'
        ]);

      const output = command.pipe();

      output.on('data', (chunk: Buffer) => chunks.push(chunk));
      output.on('end', () => {
        const out = Buffer.concat(chunks);
        this.logger.debug(`FFmpeg finished ${resolution}, size=${out.length}`);
        resolve(out);
      });
      output.on('error', (err) => {
        this.logger.error(`FFmpeg output error: ${String(err)}`);
        reject(err);
      });

      command.on('error', (err) => {
        this.logger.error(`FFmpeg command error: ${String(err)}`);
        reject(err);
      });
    });
  }

  /**
   * Validate mime type. Expanded allowlist to include common containers:
   * mp4, webm, mov, mkv, avi, flv, wmv, mpeg, 3gp
   */
  private validateVideoMime(mimeType: string) {
    if (!mimeType || typeof mimeType !== 'string') {
      throw new BadRequestException('mime_type missing or invalid');
    }

    // Basic check: must be video
    if (!mimeType.startsWith('video/')) {
      throw new BadRequestException('file is not a video');
    }

    const allow = (
      process.env.VIDEO_MIME_ALLOWLIST ??
      'video/mp4,video/webm,video/quicktime,video/x-matroska,video/x-msvideo,video/x-flv,video/x-ms-wmv,video/mpeg,video/3gpp'
    )
      .split(',')
      .map((x) => x.trim().toLowerCase());

    if (!allow.includes(mimeType.trim().toLowerCase())) {
      throw new BadRequestException('mime_type is not allowed');
    }
  }

  /**
   * Create pre-allocated VideoAsset row in UPLOADING state.
   */
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
    const folderkey = `${keyPrefix}/${videoId}`;
    const key = `${folderkey}/original-${videoId}`;

    await this.storage.putObject(
      this.storage.bucket,
      `${folderkey}.keep`,
      Buffer.alloc(0),
      0,
    );

    // create entity via new VideoAsset() to avoid TS overload/typing issues
    const asset = new VideoAsset();
    asset.ownerUserId = Number(requestUser?.sub ?? 0);
    asset.originalFilename = dto.original_filename;
    asset.mimeType = dto.mime_type;
    asset.sizeBytes = String(dto.size_bytes);
    asset.storageProvider = process.env.STORAGE_PROVIDER ?? 'minio';
    asset.storageBucket = bucket;
    asset.storageKey = key;
    asset.status = VideoAssetStatus.UPLOADING;

    const saved = await this.repo.save(asset);
    return { media_asset_id: saved.id };
  }

  /**
   * Upload original and create multiple mp4 versions (360p/720p/1080p).
   * Note: this implementation transcodes in-memory (Buffer). For large files use a worker/streaming approach.
   */
  async uploadVideoFileAndPersist(
    file: Express.Multer.File,
    requestUser: { sub?: number } | undefined,
    mediaAssetId?: number,
    ownerUserIdFromBody?: number,
  ) {
    if (!file) throw new BadRequestException('file missing');

    // Use `VideoAsset | null` because findOne() returns null when not found
    let asset: VideoAsset | null = null;

    if (mediaAssetId !== undefined && Number.isFinite(mediaAssetId)) {
      asset = await this.repo.findOne({
        where: { id: Number(mediaAssetId) },
      });

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
    const videoUuid = randomUUID();
    const keyPrefix = process.env.S3_VIDEO_KEY_PREFIX ?? 'videos';
    
    // New folder structure: videos/<video_uuid>/
    const folderPath = `${keyPrefix}/${videoUuid}`;
    const objectKey = asset?.storageKey ?? `${folderPath}`;

    // upload original file as-is (keep original) - optional, can be removed if not needed
    // await this.storage.putObject(bucket, `${folderPath}/original.mp4`, file.buffer, file.size, {
    //   'Content-Type': mime,
    // });

    // transcode to configured resolutions (in-memory)
    const versions: VideoVersion[] = [];

    // If transcoding is disabled or fails, upload original as fallback
    const enableTranscode = process.env.ENABLE_VIDEO_TRANSCODE !== 'false';
    
    if (!enableTranscode) {
      this.logger.log('Video transcoding is disabled, uploading original only');
      const originalKey = `${keyPrefix}/${videoUuid}/original.mp4`;
      await this.storage.putObject(bucket, originalKey, file.buffer, file.size, { 'Content-Type': mime });
      
      let presigned: string | undefined;
      try {
        presigned = await this.storage.presignedGetObject(bucket, originalKey, 3600);
      } catch {
        presigned = undefined;
      }
      
      versions.push({ 
        quality: 'original', 
        presignPath: `${videoUuid}/original.mp4`,
        presigned: presigned 
      });
    } else {
      for (const r of this.resolutions) {
        try {
          this.logger.log(`Transcoding to ${r.name} (${r.resolution})`);
          const processed = await this.processVideo(file.buffer, r.resolution, r.bitrate);

          // New path structure: videos/<video_uuid>/<quality>.mp4
          const versionKey = `${keyPrefix}/${videoUuid}/${r.name}.mp4`;
          await this.storage.putObject(bucket, versionKey, processed, processed.length, { 'Content-Type': 'video/mp4' });

          let presigned: string | undefined;
          try {
            presigned = await this.storage.presignedGetObject(bucket, versionKey, 3600);
          } catch {
            presigned = undefined;
          }

          // Create presign path for frontend to use
          const presignPath = `${videoUuid}/${r.name}.mp4`;
          
          versions.push({ 
            quality: r.name, 
            presignPath: presignPath,  // Frontend can use this: GET /api/media/videos/presign/{presignPath}
            presigned: presigned 
          });
        } catch (e) {
          this.logger.warn(`Transcode failed for ${r.name}: ${String(e)}`);
          // continue other resolutions
        }
      }
      
      // If all transcoding failed, upload original as fallback
      if (versions.length === 0) {
        this.logger.warn('All transcoding failed, uploading original as fallback');
        const originalKey = `${keyPrefix}/${videoUuid}/original.mp4`;
        await this.storage.putObject(bucket, originalKey, file.buffer, file.size, { 'Content-Type': mime });
        
        let presigned: string | undefined;
        try {
          presigned = await this.storage.presignedGetObject(bucket, originalKey, 3600);
        } catch {
          presigned = undefined;
        }
        
        versions.push({ 
          quality: 'original', 
          presignPath: `${videoUuid}/original.mp4`,
          presigned: presigned 
        });
      }
    }

    const ownerUserId = requestUser ? Number(requestUser.sub ?? 0) : Number(ownerUserIdFromBody ?? 0);
    const publicUrl = this.storage.buildPublicUrl(bucket, objectKey);

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
    asset.storageKey = `${keyPrefix}/${videoUuid}`;  // Store folder path as key
    asset.publicUrl = publicUrl;
    asset.status = VideoAssetStatus.READY;

    const saved = await this.repo.save(asset);

    return {
      media_asset_id: saved.id,
      storage_key: `${keyPrefix}/${videoUuid}`,
      versions,
    };
  }

  /* ---------------- streaming with range support ---------------- */

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
    const asset = await this.repo.findOne({ where: { storageBucket: bucket, storageKey: objectKey } });

    if (!asset) throw new NotFoundException('video not found');

    const size = asset.sizeBytes ? Number(asset.sizeBytes) : undefined;
    return this.streamObjectWithRange(bucket, objectKey, res, asset.mimeType ?? 'video/mp4', size);
  }

  /**
   * Get presigned URL for a specific video file
   * Example: GET /api/media/videos/presign/394b2801-9f82-46f2-a8ca-161111ce1095/360p.mp4
   * Or: GET /api/media/videos/presign/videos/394b2801-9f82-46f2-a8ca-161111ce1095/360p.mp4
   */
  async getPresignedUrl(fileKey: string) {
    const bucket = this.storage.bucket;
    const keyPrefix = process.env.S3_VIDEO_KEY_PREFIX ?? 'videos';
    
    // Handle different formats:
    // 1. Full path: "videos/uuid/360p.mp4"
    // 2. Relative path: "uuid/360p.mp4" 
    // 3. Just filename after receiving from storageKey response
    let objectKey: string;
    
    if (fileKey.startsWith(`${keyPrefix}/`)) {
      // Already has prefix
      objectKey = fileKey;
    } else if (fileKey.includes('/')) {
      // Has slash, assume it's uuid/quality.mp4 format
      objectKey = `${keyPrefix}/${fileKey}`;
    } else {
      // Single file, just add prefix
      objectKey = `${keyPrefix}/${fileKey}`;
    }
    
    try {
      const presignedUrl = await this.storage.presignedGetObject(bucket, objectKey, 3600);
      return {
        storageKey: objectKey,
        presignedUrl,
      };
    } catch (e) {
      this.logger.error(`Failed to generate presigned URL for ${objectKey}: ${String(e)}`);
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
    const key = asset.storageKey;
    if (bucket && key) {
      try {
        await this.storage.removeObject(bucket, key);
      } catch (err) {
        // optional log error
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
    const key = asset.storageKey;
    if (bucket && key) {
      try { await this.storage.removeObject(bucket, key); } catch { }
    }
    await this.repo.remove(asset);
    return { deleted: true };
  }

}