import { Injectable, Logger } from '@nestjs/common';
import * as Minio from 'minio';
import { StorageProvider } from './storage.interface';

@Injectable()
export class MinioStorageService implements StorageProvider {
  private readonly logger = new Logger(MinioStorageService.name);
  private readonly client: Minio.Client;

  constructor() {
    const endPoint = process.env.S3_ENDPOINT ?? 'http://localhost:9000';
    const port = Number(process.env.S3_PORT ?? '9000');
    const useSSL = process.env.S3_USE_SSL === 'true';

    this.client = new Minio.Client({
      endPoint,
      port,
      useSSL,
      accessKey: process.env.S3_ACCESS_KEY_ID ?? '',
      secretKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    });

    this.logger.log(`MinIO connected → ${useSSL ? 'https' : 'http'}://${endPoint}:${port}`);
  }

  get bucket(): string {
    return process.env.S3_BUCKET ?? 'media';
  }

  // ================= Presign PUT =================
  async presignPut(
    bucket: string,
    key: string,
    _contentType: string,
    expiresIn: number,
  ): Promise<string> {
    // MinIO รองรับ Promise อยู่แล้ว
    return this.client.presignedPutObject(bucket, key, expiresIn);
  }

  async presignedPutObject(
    bucket: string,
    key: string,
    expiresIn: number,
  ): Promise<string> {
    return this.client.presignedPutObject(bucket, key, expiresIn);
  }



  // ================= Presign GET =================
  async presignGet(bucket: string, key: string, expiresIn: number): Promise<string> {
    return this.client.presignedGetObject(bucket, key, expiresIn);
  }

  async presignedGetObject(bucket: string, key: string, expiresIn: number, responseHeaders?: Record<string, string>): Promise<string> {

    if (responseHeaders) {
      return this.client.presignedGetObject(bucket, key, expiresIn, responseHeaders);
    }
    return this.client.presignedGetObject(bucket, key, expiresIn);
  }

  // ================= Public URL =================
  buildPublicUrl(bucket: string, key: string): string {
  const protocol = process.env.S3_USE_SSL === 'true' ? 'https' : 'http';
  const domain = (process.env.S3_ENDPOINT ?? '').replace(/^https?:\/\//, '');
  
  return `${protocol}://${domain}/${bucket}/${encodeURI(key)}`;
}

  // ================= Upload =================
  async putObject(
    bucket: string,
    key: string,
    body: Buffer,
    size?: number,
    meta?: Record<string, string>,
  ): Promise<void> {
    await this.client.putObject(bucket, key, body, size, meta);
  }

  // ================= Delete =================
  async deleteObject(bucket: string, key: string): Promise<void> {
    await this.client.removeObject(bucket, key);
  }
}
