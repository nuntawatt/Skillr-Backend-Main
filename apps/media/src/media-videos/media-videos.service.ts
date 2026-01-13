import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Not, Repository } from 'typeorm';
import { StorageService } from '../storage/storage.service';
import { VideoAsset, VideoAssetStatus } from './entities/video-asset.entity';
import { CreateVideoUploadDto } from './dto/create-video-upload.dto';
import type { Response } from 'express';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class MediaVideosService {
  private readonly logger = new Logger(MediaVideosService.name);

  private readonly SUPPORTED_VIDEO_MIMES = [
    'video/mp4',
    'video/webm',
    'video/quicktime',      // .mov
    'video/x-msvideo',      // .avi
    'video/avi',            // .avi (alternative)
    'video/msvideo',        // .avi (alternative)
    'video/x-ms-wmv',       // .wmv
    'video/x-matroska',     // .mkv
    'video/x-flv',          // .flv
    'video/3gpp',           // .3gp
    'video/3gpp2',          // .3g2
    'video/ogg',            // .ogv
    'video/mpeg',           // .mpeg, .mpg
    'video/x-mpeg',         // .mpeg (alternative)
    'video/mp2t',           // .ts
    'video/x-m4v',          // .m4v
    'application/octet-stream', // fallback for unknown binary
  ];

  // mime types that need conversion to mp4
  private readonly MIMES_NEED_CONVERSION = [
    'video/x-msvideo',
    'video/avi',
    'video/msvideo',
    'video/x-ms-wmv',
    'video/x-matroska',
    'video/x-flv',
    'video/3gpp',
    'video/3gpp2',
    'video/ogg',
    'video/mpeg',
    'video/x-mpeg',
    'video/mp2t',
    'video/quicktime',
    'video/x-m4v',
  ];

  constructor(
    private readonly storage: StorageService,
    @InjectRepository(VideoAsset)
    private readonly repo: Repository<VideoAsset>,
  ) { }

  private validateVideoMime(mimeType: string) {
    const mime = mimeType.trim().toLowerCase();
    
    // ตรวจสอบว่าเป็นวิดีโอหรือไม่
    if (!mime.startsWith('video/') && mime !== 'application/octet-stream') {
      throw new BadRequestException('mime_type is not a valid video type');
    }

    // allowlist check
    const allow = process.env.VIDEO_MIME_ALLOWLIST
      ? process.env.VIDEO_MIME_ALLOWLIST.split(',').map(x => x.trim().toLowerCase())
      : this.SUPPORTED_VIDEO_MIMES;

    if (!allow.includes(mime)) {
      throw new BadRequestException(`mime_type '${mime}' is not allowed`);
    }
  }

  // mimie types that need conversion
  private needsConversion(mimeType: string): boolean {
    const mime = mimeType.trim().toLowerCase();
    return this.MIMES_NEED_CONVERSION.includes(mime);
  }

  // mp4 conversion
  private async convertToMp4(inputBuffer: Buffer, originalFilename: string): Promise<{ buffer: Buffer; filename: string }> {
    const tempDir = os.tmpdir();
    const uniqueId = randomUUID();
    const inputExt = path.extname(originalFilename) || '.avi';
    const inputPath = path.join(tempDir, `input_${uniqueId}${inputExt}`);
    const outputPath = path.join(tempDir, `output_${uniqueId}.mp4`);

    try {
      // Write input buffer to a temporary file
      await fs.promises.writeFile(inputPath, inputBuffer);

      // Convert using ffmpeg
      await this.runFfmpeg(inputPath, outputPath);

      // Read output file
      const outputBuffer = await fs.promises.readFile(outputPath);

      // Create new filename
      const baseName = path.basename(originalFilename, inputExt);
      const newFilename = `${baseName}.mp4`;

      return { buffer: outputBuffer, filename: newFilename };
    } finally {
      // Delete temporary files
      try {
        await fs.promises.unlink(inputPath);
      } catch { /* ignore */ }
      try {
        await fs.promises.unlink(outputPath);
      } catch { /* ignore */ }
    }
  }

  // ffmpeg execution
  private runFfmpeg(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
      
      const args = [
        '-i', inputPath,
        '-c:v', 'libx264',        // use H.264 codec
        '-c:a', 'aac',            // use AAC audio codec
        '-preset', 'fast',        // encoding speed
        '-crf', '23',             // quality (0-51, lower is better)
        '-movflags', '+faststart', // enable fast start for web playback
        '-y',                     // overwrite output file
        outputPath
      ];

      this.logger.log(`Converting video: ${inputPath} -> ${outputPath}`);

      const ffmpeg = spawn(ffmpegPath, args);
      
      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          this.logger.log('Video conversion completed successfully');
          resolve();
        } else {
          this.logger.error(`FFmpeg exited with code ${code}: ${stderr}`);
          reject(new BadRequestException(`Video conversion failed: ${stderr.slice(-500)}`));
        }
      });

      ffmpeg.on('error', (err) => {
        this.logger.error(`FFmpeg error: ${err.message}`);
        reject(new BadRequestException(`FFmpeg not found or failed to start. Make sure ffmpeg is installed. Error: ${err.message}`));
      });
    });
  }

  async createVideoUpload(dto: CreateVideoUploadDto, requestUser: { sub?: any } | undefined) {
    this.validateVideoMime(dto.mime_type);
    const maxSizeBytes = Number(process.env.VIDEO_MAX_SIZE_BYTES ?? String(2 * 1024 * 1024 * 1024));
    if (dto.size_bytes > maxSizeBytes) throw new BadRequestException('size_bytes exceeds limit');

    const bucket = this.storage.bucket;
    const keyPrefix = process.env.S3_VIDEO_KEY_PREFIX ?? 'videos';
    const key = `${keyPrefix}/${randomUUID()}`;

    const asset = this.repo.create({
      ownerUserId: Number(requestUser?.sub ?? 0),
      originalFilename: dto.original_filename,
      mimeType: dto.mime_type,
      sizeBytes: String(dto.size_bytes),
      storageProvider: process.env.STORAGE_PROVIDER ?? 'minio',
      storageBucket: bucket,
      storageKey: key,
      status: VideoAssetStatus.UPLOADING,
    } as Partial<VideoAsset>);

    const saved = await this.repo.save(asset);
    return { media_asset_id: saved.id };
  }

  async uploadVideoFileAndPersist(file: Express.Multer.File, requestUser: { sub?: number } | undefined, mediaAssetId?: number, ownerUserIdFromBody?: number) {
    if (!file) throw new BadRequestException('file missing');

    // If provided an asset id, link to it
    let asset: VideoAsset | undefined;

    if (mediaAssetId !== undefined && Number.isFinite(mediaAssetId)) {
      const found = await this.repo.findOne({
        where: { id: Number(mediaAssetId) },
      });

      if (!found) {
        throw new NotFoundException('media asset not found');
      }

      if (found.status !== VideoAssetStatus.UPLOADING) {
        throw new BadRequestException('invalid state');
      }

      asset = found;
    }

    // basic mime check
    let mime = file.mimetype ?? '';
    this.validateVideoMime(mime);

    const maxSizeBytes = Number(process.env.VIDEO_MAX_SIZE_BYTES ?? String(2 * 1024 * 1024 * 1024));
    if (file.size > maxSizeBytes) throw new BadRequestException('file size exceeds limit');

    // ตรวจสอบว่าต้องแปลงเป็น MP4 หรือไม่
    let fileBuffer = file.buffer;
    let fileName = file.originalname;
    let fileSize = file.size;

    if (this.needsConversion(mime)) {
      this.logger.log(`Converting video from ${mime} to MP4: ${fileName}`);
      try {
        const converted = await this.convertToMp4(file.buffer, file.originalname);
        fileBuffer = converted.buffer;
        fileName = converted.filename;
        fileSize = converted.buffer.length;
        mime = 'video/mp4';
        this.logger.log(`Conversion complete. New size: ${fileSize} bytes`);
      } catch (error) {
        this.logger.error(`Video conversion failed: ${error.message}`);
        throw new BadRequestException(`Video conversion failed: ${error.message}`);
      }
    }

    const bucket = this.storage.bucket;
    // ใช้นามสกุล .mp4 สำหรับ key
    const fileExt = path.extname(fileName) || '.mp4';
    const objectKey = asset?.storageKey ?? `${process.env.S3_VIDEO_KEY_PREFIX ?? 'videos'}/${randomUUID()}${fileExt}`;
    await this.storage.putObject(bucket, objectKey, fileBuffer, fileSize, { 'Content-Type': mime });

    const ownerUserId = requestUser ? Number(requestUser.sub ?? 0) : Number(ownerUserIdFromBody ?? 0);
    const publicUrl = this.storage.buildPublicUrl(bucket, objectKey);

    const saved = await this.repo.save(
      this.repo.create({
        ...(asset?.id ? { id: asset.id } : {}),
        ownerUserId: asset?.ownerUserId ?? ownerUserId,
        originalFilename: fileName,
        mimeType: mime,
        sizeBytes: String(fileSize),
        storageProvider: process.env.STORAGE_PROVIDER ?? 'minio',
        storageBucket: bucket,
        storageKey: objectKey,
        publicUrl,
        status: VideoAssetStatus.READY,
      }),
    );

    const key = objectKey.startsWith(`${process.env.S3_VIDEO_KEY_PREFIX ?? 'videos'}/`) ? objectKey.slice((process.env.S3_VIDEO_KEY_PREFIX ?? 'videos').length + 1) : objectKey;
    return {
      media_asset_id: saved.id,
      key,
      storage_key: objectKey,
      public_url: saved.publicUrl,
      converted: this.needsConversion(file.mimetype ?? ''),
      original_mime: file.mimetype,
      final_mime: mime,
    };
  }

  private async streamObjectWithRange(bucket: string, objectKey: string, res: Response, mimeType: string, size?: number) {
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
    if (!match) {
      res.status(416).end();
      return;
    }

    let start: number;
    let end: number;

    if (match[1] === '' && match[2]) {
      const suffix = Number(match[2]);
      if (isNaN(suffix)) { res.status(416).end(); return; }
      start = Math.max(size - suffix, 0);
      end = size - 1;
    } else {
      start = Number(match[1]);
      end = match[2] ? Number(match[2]) : Math.min(start + 1024 * 1024, size - 1);
    }

    if (isNaN(start) || isNaN(end) || start < 0 || start >= size || start > end) {
      res.status(416).end();
      return;
    }

    const chunkSize = end - start + 1;
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
    res.setHeader('Content-Length', String(chunkSize));
    res.setHeader('Content-Type', mimeType);

    const stream = await this.storage.getPartialObject(bucket, objectKey, start, chunkSize);
    stream.pipe(res);
  }

  async streamObjectByKey(key: string, res: Response) {
    const bucket = this.storage.bucket;
    const objectKey = key.startsWith('videos/') ? key : `videos/${key}`;
    const asset = await this.repo.findOne({ where: { storageBucket: bucket, storageKey: objectKey } });
    if (!asset) throw new NotFoundException('video not found');
    
    const mime = asset.mimeType ?? 'video/mp4';
    const size = asset.sizeBytes ? Number(asset.sizeBytes) : undefined;
    return this.streamObjectWithRange(bucket, objectKey, res, mime, size);
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