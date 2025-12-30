// src/modules/media-processing/dto/transcode-video.dto.ts
import { IsEnum, IsNumber } from 'class-validator';

export enum VideoQuality {
  P360 = '360p',
  P720 = '720p',
  P1080 = '1080p',
}

export class TranscodeVideoDto {
  @IsNumber()
  mediaAssetId: number;

  @IsEnum(VideoQuality)
  quality: VideoQuality;
}