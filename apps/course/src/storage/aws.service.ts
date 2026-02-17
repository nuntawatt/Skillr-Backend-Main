import { Injectable, Logger, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { MediaConvertClient, DescribeEndpointsCommand, CreateJobCommand } from '@aws-sdk/client-mediaconvert';
import { randomUUID } from 'crypto';
import { lookup } from 'mime-types';

import { StorageProvider } from './storage.interface';

// AWS S3 Storage Service
@Injectable()
export class AwsS3StorageService implements StorageProvider {
  private readonly logger = new Logger(AwsS3StorageService.name);
  private s3: S3Client | null = null;
  private readonly region?: string;
  private readonly _bucket?: string;
  private readonly cloudfrontDomain?: string;
  private cachedMcEndpoint?: string;

  constructor() {
    // NOTE: อย่า throw ใน constructor เพราะจะทำให้ NestJS boot ไม่ขึ้นใน dev env ที่ยังไม่ set AWS_*.
    // จะตรวจสอบจริงตอนมีการใช้งาน method (lazy init) แทน
    this.region = process.env.AWS_REGION;
    this._bucket = process.env.AWS_S3_BUCKET;
    this.cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;

    if (!this.region || !this._bucket || !this.cloudfrontDomain) {
      this.logger.warn(
        'AWS storage is not configured (missing AWS_REGION / AWS_S3_BUCKET / AWS_CLOUDFRONT_DOMAIN). ' +
          'Storage features will throw on use.',
      );
      return;
    }

    this.logger.log(`AWS storage configured → bucket: ${this._bucket}, region: ${this.region}, CDN: ${this.cloudfrontDomain}`);
  }

  // getter เพื่อให้เข้าถึง bucket ได้จากภายนอก
  get bucket(): string {
    this.ensureConfigured();
    return this._bucket as string;
  }

  private ensureConfigured(): void {
    if (!this.region) throw new Error('AWS_REGION environment variable is required');
    if (!this._bucket) throw new Error('AWS_S3_BUCKET environment variable is required');
    if (!this.cloudfrontDomain) throw new Error('AWS_CLOUDFRONT_DOMAIN environment variable is required');
  }

  private ensureS3Initialized(): void {
    this.ensureConfigured();
    if (this.s3) return;

    const credentials =
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined;

    this.s3 = new S3Client({
      region: this.region as string,
      ...(credentials && { credentials }),
    });
  }

  // ==================== Upload Methods ====================

  /**
   * Upload a file to S3
   * @param bucket - S3 bucket name
   * @param key - Storage key (e.g., images/{uuid}.jpg)
   * @param body - File buffer
   * @param size - File size in bytes (optional)
   * @param metadata - Additional metadata (e.g., { 'Content-Type': 'image/jpeg' })
   */
  async putObject(
    bucket: string,
    key: string,
    body: Buffer,
    size?: number,
    metadata?: Record<string, string>,
  ): Promise<void> {
    try {
      this.ensureS3Initialized();
      const contentType = this.detectContentType(key, metadata);

      const cmd = new PutObjectCommand({
        Bucket: bucket || this._bucket,
        Key: key,
        Body: body,
        ...(size && { ContentLength: size }),
        ...(contentType && { ContentType: contentType }),
        ...(metadata && { Metadata: metadata }),
      });

      await this.s3!.send(cmd);
      this.logger.debug(`Uploaded: s3://${bucket || this._bucket}/${key}`);
    } catch (err) {
      this.logger.error(err);
      throw new InternalServerErrorException('putObject failed');
    }
  }

  // อัพโหลดไฟล์แบบ helper ที่รับเฉพาะข้อมูลที่จำเป็นและจัดการ key เอง
  async uploadFile(params: {
    key: string;
    body: Buffer;
    contentType?: string;
    bucket?: string;
  }): Promise<{ key: string; url: string }> {
    this.ensureS3Initialized();
    const bucket = params.bucket || this.bucket;
    const contentType = params.contentType || this.detectContentType(params.key);

    await this.putObject(bucket, params.key, params.body, params.body.length, {
      'Content-Type': contentType,
    });

    return {
      key: params.key,
      url: this.buildPublicUrl(bucket, params.key),
    };
  }

  // ==================== Delete Methods ====================

  /**
   * Delete a file from S3
   */
  async deleteObject(bucket: string, key: string): Promise<void> {
    try {
      this.ensureS3Initialized();
      const cmd = new DeleteObjectCommand({
        Bucket: bucket || this._bucket,
        Key: key,
      });

      await this.s3!.send(cmd);
      this.logger.debug(`Deleted: s3://${bucket || this._bucket}/${key}`);
    } catch (err) {
      this.logger.error(err);
      throw new InternalServerErrorException('deleteObject failed');
    }
  }

  // ==================== URL Methods ====================

  /**
   * Build CloudFront public URL
   * Format: https://cdn.skillacademy.com/{folder}/{filename}
   */
  buildPublicUrl(bucket: string, key: string): string {
    this.ensureConfigured();
    if (!key) throw new BadRequestException('key missing');

    const b = bucket || this._bucket;
    if (!b) throw new BadRequestException('bucket missing');

    // เราใช้ CloudFront เป็น CDN base
    return `${this.cloudfrontDomain}/${key}`;
  }

  // สำหรับกรณีที่ต้องการ S3 URL ตรงๆ (ไม่แนะนำให้ใช้สำหรับ public access)
  getS3Url(bucket: string, key: string): string {
    this.ensureConfigured();
    const b = bucket || (this._bucket as string);
    return `https://${b}.s3.${this.region as string}.amazonaws.com/${encodeURI(key)}`;
  }

  // ==================== Presigned URL Methods ====================

  // คืน URL สำหรับให้ client อัพโหลดไฟล์โดยตรงไปยัง S3 โดยไม่ต้องผ่าน backend (เผื่อนำไปต่อยอดทำ Quantity Video Upload ในอนาคต)
  async presignPut(bucket: string, key: string, contentType: string, expiresIn: number): Promise<string> {
    try {
      this.ensureS3Initialized();
      if (!key) throw new BadRequestException('key missing');

      const b = bucket || this._bucket;
      if (!b) throw new BadRequestException('bucket missing');

      const cmd = new PutObjectCommand({
        Bucket: b,
        Key: key,
        ContentType: contentType,
        ACL: 'private',
      });

      return await getSignedUrl(this.s3!, cmd, { expiresIn });
    } catch (error) {
      this.logger.error(error);
      this.logger.error(`Failed to generate presigned PUT URL: ${error.message}`);
      throw new InternalServerErrorException('Failed to generate upload URL');
    }
  }



  // ==================== Utility Methods ====================

  // ตรวจสอบว่าไฟล์มีอยู่ใน S3 หรือไม่
  async fileExists(bucket: string, key: string): Promise<boolean> {
    try {
      this.ensureS3Initialized();
      const cmd = new HeadObjectCommand({
        Bucket: bucket || this._bucket,
        Key: key,
      });

      await this.s3!.send(cmd);
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  // ตรวจสอบและกำหนด Content-Type จาก metadata หรือจากนามสกุลไฟล์
  private detectContentType(key: string, metadata?: Record<string, string>): string {
    // ถ้ามี Content-Type ใน metadata ให้ใช้ค่านั้น
    if (metadata?.['Content-Type']) {
      return metadata['Content-Type'];
    }

    // ลองตรวจสอบจากนามสกุลไฟล์
    const mimeType = lookup(key);
    if (mimeType) {
      return mimeType;
    }

    // กำหนดค่าเริ่มต้นตาม prefix ของ key (ถ้าไม่สามารถตรวจสอบได้)
    if (key.startsWith('images/')) {
      return 'image/jpeg';
    }
    if (key.startsWith('videos/')) {
      return 'video/mp4';
    }

    return 'application/octet-stream';
  }

  // Generate a unique storage key for images
  // Format: images/{uuid}.{ext}
  generateImageKey(originalFilename: string): string {
    const uuid = randomUUID();
    const ext = this.getFileExtension(originalFilename) || 'jpg';
    return `images/${uuid}.${ext}`;
  }

  // Generate a unique storage key for videos
  // Format: videos/{uuid}.{ext}
  generateVideoKey(originalFilename: string): string {
    const uuid = randomUUID();
    const ext = this.getFileExtension(originalFilename) || 'mp4';
    return `videos/${uuid}.${ext}`;
  }

  // เรียกใช้ฟังก์ชันเดียวกันในการสร้าง key สำหรับทั้งภาพและวิดีโอ โดยตรวจสอบ prefix ของ originalFilename
  private getFileExtension(filename: string): string | null {
    if (!filename) return null;
    const match = filename.match(/\.([^.]+)$/); // ดึงนามสกุลไฟล์จากชื่อไฟล์
    return match ? match[1].toLowerCase() : null;
  }


  // เรียก MediaConvert endpoint และ cache ไว้ในตัวแปรเพื่อใช้ซ้ำในการสร้างงานแปลงวิดีโอ
  private async getMediaConvertEndpoint(): Promise<string> {
    if (this.cachedMcEndpoint) return this.cachedMcEndpoint;

    const client = new MediaConvertClient({ region: this.region });
    const res = await client.send(new DescribeEndpointsCommand({}));
    if (!res.Endpoints || res.Endpoints.length === 0) {
      throw new BadRequestException('No MediaConvert endpoints returned');
    }

    this.cachedMcEndpoint = res.Endpoints[0].Url!;
    this.logger.log(`MediaConvert endpoint: ${this.cachedMcEndpoint}`);
    return this.cachedMcEndpoint;
  }

  // สร้างงาน MediaConvert เพื่อแปลงวิดีโอ (เพื่อใช้ในฟีเจอร์ Video Transcoding ในอนาคต) 
  async createMediaConvertJob(inputS3Url: string, outputS3Prefix: string, roleArn: string) {
    const endpoint = await this.getMediaConvertEndpoint();
    const mc = new MediaConvertClient({
      region: this.region,
      endpoint,
    });

    const jobSettings: any = {
      OutputGroups: [
        {
          Name: 'Apple HLS',
          OutputGroupSettings: {
            Type: 'HLS_GROUP_SETTINGS',
            HlsGroupSettings: {
              Destination: `s3://${this._bucket}/${outputS3Prefix}`,
              SegmentLength: 6,
              MinSegmentLength: 0,
            },
          },
          Outputs: [
            // 1080p
            {
              ContainerSettings: { Container: 'M3U8', M3u8Settings: {} },
              VideoDescription: {
                CodecSettings: {
                  Codec: 'H_264',
                  H264Settings: {
                    RateControlMode: 'CBR',
                    Bitrate: 6500000,
                    CodecProfile: 'MAIN',
                    Height: 1080,
                    Width: 1920,
                    MaxBitrate: 6500000,
                    SceneChangeDetect: 'TRANSITION_DETECTION',
                  },
                },
              },
              AudioDescriptions: [
                {
                  CodecSettings: {
                    Codec: 'AAC',
                    AacSettings: { Bitrate: 96000, CodingMode: 'CODING_MODE_2_0', SampleRate: 48000 },
                  },
                },
              ],
            },
            // 720p
            {
              ContainerSettings: { Container: 'M3U8', M3u8Settings: {} },
              VideoDescription: {
                CodecSettings: {
                  Codec: 'H_264',
                  H264Settings: {
                    RateControlMode: 'CBR',
                    Bitrate: 3500000,
                    CodecProfile: 'MAIN',
                    Height: 720,
                    Width: 1280,
                    MaxBitrate: 3500000,
                    SceneChangeDetect: 'TRANSITION_DETECTION',
                  },
                },
              },
              AudioDescriptions: [
                {
                  CodecSettings: {
                    Codec: 'AAC',
                    AacSettings: { Bitrate: 96000, CodingMode: 'CODING_MODE_2_0', SampleRate: 48000 },
                  },
                },
              ],
            },
            // 360p
            {
              ContainerSettings: { Container: 'M3U8', M3u8Settings: {} },
              VideoDescription: {
                CodecSettings: {
                  Codec: 'H_264',
                  H264Settings: {
                    RateControlMode: 'CBR',
                    Bitrate: 800000,
                    CodecProfile: 'MAIN',
                    Height: 360,
                    Width: 640,
                    MaxBitrate: 800000,
                    SceneChangeDetect: 'TRANSITION_DETECTION',
                  },
                },
              },
              AudioDescriptions: [
                {
                  CodecSettings: {
                    Codec: 'AAC',
                    AacSettings: { Bitrate: 64000, CodingMode: 'CODING_MODE_2_0', SampleRate: 48000 },
                  },
                },
              ],
            },
          ],
        },
      ],
      AdAvailOffset: 0,
      Inputs: [{ FileInput: inputS3Url }],
    };

    const createJobCmd = new CreateJobCommand({ Role: roleArn, Settings: jobSettings });
    const res = await mc.send(createJobCmd);
    this.logger.log(`MediaConvert job created: ${res.Job?.Id}`);
    return res.Job;
  }

  // ฟังก์ชันช่วยเหลือสำหรับการสร้าง video ID แบบสุ่ม (ถ้าต้องการใช้ในที่อื่นๆ)
  generateVideoId(): string {
    return randomUUID().replace(/-/g, '').slice(0, 12);
  }
}

// Export alias for backward compatibility
export { AwsS3StorageService as AwsService };
