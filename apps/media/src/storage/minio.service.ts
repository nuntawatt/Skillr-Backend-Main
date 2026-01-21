import { Injectable, Logger } from '@nestjs/common';
import * as Minio from 'minio';
import { StorageProvider } from './storage.interface';

@Injectable()
export class MinioStorageService implements StorageProvider {
  private readonly logger = new Logger(MinioStorageService.name);
  private readonly client: Minio.Client;

  constructor() {
    const endpoint = process.env.S3_ENDPOINT ?? '';
    const url = new URL(endpoint);

    this.client = new Minio.Client({
      endPoint: url.hostname,
      port: Number(url.port || 9000),
      useSSL: url.protocol === 'https:',
      accessKey: process.env.S3_ACCESS_KEY_ID ?? '',
      secretKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    });
  }

  get bucket(): string {
    return process.env.S3_BUCKET ?? 'media';
  }

  // ===== Presign PUT =====
  async presignPut(bucket: string, key: string, _contentType: string, expiresIn: number) {
    return this.client.presignedPutObject(bucket, key, expiresIn);
  }

  async presignedPutObject(bucket: string, key: string, expiresIn: number) {
    return this.client.presignedPutObject(bucket, key, expiresIn);
  }

  // ===== Presign GET =====
  async presignGet(bucket: string, key: string, expiresIn: number) {
    return this.client.presignedGetObject(bucket, key, expiresIn);
  }

  async presignedGetObject(bucket: string, key: string, expiresIn: number) {
    return this.client.presignedGetObject(bucket, key, expiresIn);
  }

  // ===== Upload =====
  async putObject(
    bucket: string,
    key: string,
    body: Buffer,
    size?: number,
    meta?: Record<string, string>,
  ) {
    await this.client.putObject(bucket, key, body, size, meta);
  }

  // ===== Delete =====
  async deleteObject(bucket: string, key: string) {
    await this.client.removeObject(bucket, key);
  }

  buildPublicUrl(bucket: string, key: string) {
    return `${process.env.S3_ENDPOINT}/${bucket}/${key}`;
  }
}
