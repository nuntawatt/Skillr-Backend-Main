// minio.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as Minio from 'minio';
import { StorageProvider } from './storage.interface';

@Injectable()
export class MinioStorageService implements StorageProvider {
  private readonly logger = new Logger(MinioStorageService.name);
  private readonly client: Minio.Client;
  readonly bucket: string;

  constructor() {
    const endpointRaw = process.env.MINIO_ENDPOINT ?? process.env.S3_ENDPOINT;
    let endpoint = endpointRaw ? endpointRaw.trim().split(/\s+/)[0] : 'localhost:9000';
    // if passed full url like http(s)://host:port, parse
    try {
      const u = new URL(endpoint);
      endpoint = u.hostname + (u.port ? `:${u.port}` : '');
    } catch {
      // keep as-is
    }

    this.bucket = process.env.S3_BUCKET ?? process.env.VIDEO_BUCKET ?? 'media';
    const port = Number(process.env.MINIO_PORT ?? 9000);
    const useSSL = (process.env.MINIO_USE_SSL ?? 'false') === 'true';
    const accessKey = process.env.MINIO_ACCESS_KEY ?? process.env.S3_ACCESS_KEY_ID ?? '';
    const secretKey = process.env.MINIO_SECRET_KEY ?? process.env.S3_SECRET_ACCESS_KEY ?? '';

    const hostOnly = endpoint.split(':')[0];

    this.client = new Minio.Client({
      endPoint: hostOnly,
      port,
      useSSL,
      accessKey,
      secretKey,
    });
  }

  async putObject(bucket: string, key: string, body: Buffer, size?: number) {
    await this.client.putObject(bucket, key, body, size ?? body.length);
  }

  async presignedPutObject(bucket: string, key: string, expiresSeconds = 60 * 15): Promise<string> {
    return this.client.presignedPutObject(bucket, key, expiresSeconds);
  }

  async presignedGetObject(bucket: string, key: string, expiresSeconds = 60 * 60): Promise<string> {
    return this.client.presignedGetObject(bucket, key, expiresSeconds);
  }

  // make wrapper names for compatibility with interface optional names
  async presignPut(bucket: string, key: string, contentType: string, expiresSeconds = 60 * 15) {
    // MinIO presignedPutObject does not accept content-type param — the client will PUT with headers.
    return this.presignedPutObject(bucket, key, expiresSeconds);
  }

  async presignGet(bucket: string, key: string, expiresSeconds = 60 * 60) {
    return this.presignedGetObject(bucket, key, expiresSeconds);
  }

  async deleteObject(bucket: string, key: string) {
    await this.client.removeObject(bucket, key);
  }

  buildPublicUrl(bucket: string, key: string) {
    // use public endpoint if provided
    const base = (process.env.MINIO_PUBLIC_ENDPOINT ?? process.env.S3_PUBLIC_BASE_URL ?? process.env.MINIO_ENDPOINT ?? '').replace(/\/$/, '');
    if (base) {
      const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
      // if base already contains protocol, use it
      if (base.startsWith('http')) return `${base}/${bucket}/${key}`;
      return `${protocol}://${base}/${bucket}/${key}`;
    }
    // fallback: build localhost style
    const host = (process.env.MINIO_ENDPOINT ?? 'localhost:9000').replace(/\/$/, '');
    const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
    return `${protocol}://${host}/${bucket}/${key}`;
  }
}
