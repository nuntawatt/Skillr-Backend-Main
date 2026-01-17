// aws.service.ts
import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageProvider } from './storage.interface';

@Injectable()
export class AwsStorageService implements StorageProvider {
  readonly bucket: string;
  private readonly client: S3Client;

  constructor() {
    this.bucket = process.env.VIDEO_BUCKET ?? process.env.S3_BUCKET ?? 'media';
    const region = process.env.AWS_REGION ?? 'ap-southeast-1';
    this.client = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
      },
    });
  }

  async putObject(bucket: string, key: string, body: Buffer, size?: number, meta?: Record<string, string>) {
    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentLength: size ?? body.length,
      ContentType: meta?.['Content-Type'],
    });
    await this.client.send(cmd);
  }

  async presignPut(bucket: string, key: string, contentType: string, expiresSeconds = 60 * 15) {
    const put = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, put, { expiresIn: expiresSeconds });
  }

  async presignGet(bucket: string, key: string, expiresSeconds = 60 * 60) {
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(this.client, cmd, { expiresIn: expiresSeconds });
  }

  // compatibility names
  async presignedPutObject(bucket: string, key: string, expiresSeconds = 60 * 15) {
    // no content type param here — prefer presignPut
    return this.presignPut(bucket, key, 'application/octet-stream', expiresSeconds);
  }

  async presignedGetObject(bucket: string, key: string, expiresSeconds = 60 * 60) {
    return this.presignGet(bucket, key, expiresSeconds);
  }

  async deleteObject(bucket: string, key: string) {
    const cmd = new DeleteObjectCommand({ Bucket: bucket, Key: key });
    await this.client.send(cmd);
  }

  buildPublicUrl(bucket: string, key: string) {
    // S3 virtual-hosted-style
    const region = process.env.AWS_REGION ?? 'ap-southeast-1';
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }
}
