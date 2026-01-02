// src/modules/media-processing/media-processing.service.ts
import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
import { VideoQuality } from './dto/transcode-video.dto';
import { ContentService } from '../content/content.service';

@Injectable()
export class MediaProcessingService {
  constructor(
    private readonly contentService: ContentService
  ) { }

  // settings profiles for different qualities
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

  // Transcode video using ffmpeg
  async transcodeVideo(
    bucket: string,
    sourceKey: string,
    targetKey: string,
    quality: VideoQuality
  ) {
    const profile = this.getProfile(quality);

    const inputStream = await this.contentService.getObjectStream(
      bucket,
      sourceKey,
    );

    // Spawn ffmpeg process
    const ffmpeg = spawn('ffmpeg', [
      '-i',
      'pipe:0',

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

      '-movflags',
      'frag_keyframe+empty_moov',

      '-f',
      'mp4',
      'pipe:1',
    ]);

    inputStream.pipe(ffmpeg.stdin);

    // error logs
    ffmpeg.stderr.on('data', (data) => {
      console.error('[ffmpeg]', data.toString());
    });

    ffmpeg.on('error', (err) => {
      console.error('[ffmpeg] process error', err);
    });

    // stream safety
    inputStream.on('error', (err) => {
      console.error('[input stream]', err);
      ffmpeg.kill('SIGKILL');
    });

    ffmpeg.stdin.on('error', (err) => {
      console.error('[ffmpeg stdin]', err);
    });

    ffmpeg.stdout.on('error', (err) => {
      console.error('[ffmpeg stdout]', err);
    });

    // wait for finish
    await new Promise<void>((resolve, reject) => {
      ffmpeg.once('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ffmpeg exited with code ${code}`));
        }
      });
    });


    await this.contentService.putObject(
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
