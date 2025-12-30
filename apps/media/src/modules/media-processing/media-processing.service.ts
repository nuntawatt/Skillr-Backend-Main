// src/modules/media-processing/media-processing.service.ts
import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
import { VideoQuality } from './dto/transcode-video.dto';
import { MinioService } from '../content/minio.service'; // ปรับ path ให้ตรงของคุณ

@Injectable()
export class MediaProcessingService {
  constructor(private readonly minioService: MinioService) {}

  private getProfile(quality: VideoQuality) {
    switch (quality) {
      case VideoQuality.P360:
        return { w: 640, h: 360, vBitrate: '800k', aBitrate: '96k' };
      case VideoQuality.P720:
        return { w: 1280, h: 720, vBitrate: '2500k', aBitrate: '128k' };
      case VideoQuality.P1080:
        return { w: 1920, h: 1080, vBitrate: '4500k', aBitrate: '192k' };
      default:
        throw new Error('Unsupported quality');
    }
  }

  async transcodeVideo(
    bucket: string,
    sourceKey: string,
    targetKey: string,
    quality: VideoQuality,
  ) {
    const profile = this.getProfile(quality);

    // 1. read original video from MinIO
    const inputStream = await this.minioService.getObjectStream(
      bucket,
      sourceKey,
    );

    // 2. spawn ffmpeg
    const ffmpeg = spawn('ffmpeg', [
      '-i',
      'pipe:0',

      // scale + keep aspect ratio
      '-vf',
      `scale=${profile.w}:${profile.h}:force_original_aspect_ratio=decrease`,

      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-b:v',
      profile.vBitrate,

      '-c:a',
      'aac',
      '-b:a',
      profile.aBitrate,

      // enable progressive streaming
      '-movflags',
      'frag_keyframe+empty_moov',

      '-f',
      'mp4',
      'pipe:1',
    ]);

    // pipe input → ffmpeg
    inputStream.pipe(ffmpeg.stdin);

    // 3. write output back to MinIO
    await this.minioService.putObject(
      bucket,
      targetKey,
      ffmpeg.stdout,
      undefined,
      {
        'Content-Type': 'video/mp4',
      },
    );
  }
}
