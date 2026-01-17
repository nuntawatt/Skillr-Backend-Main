// storage.interface.ts
import type { Readable } from 'stream';

export interface StorageProvider {
  readonly bucket: string;

  putObject(bucket: string, key: string, body: Buffer, size?: number, meta?: Record<string, string>): Promise<void>;

  // presign for download (GET)
  presignGet?(bucket: string, key: string, expiresSeconds?: number): Promise<string>;
  // presign for direct upload (PUT). return signed url
  presignPut?(bucket: string, key: string, contentType: string, expiresSeconds?: number): Promise<string>;

  // compatibility names (providers might expose different method names)
  presignedGetObject?(bucket: string, key: string, expiresSeconds?: number): Promise<string>;
  presignedPutObject?(bucket: string, key: string, expiresSeconds?: number): Promise<string>;

  // delete object
  deleteObject(bucket: string, key: string): Promise<void>;

  // optional helper to build public url for public buckets
  buildPublicUrl?(bucket: string, key: string): string;
}
