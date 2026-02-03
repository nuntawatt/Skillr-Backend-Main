import type { Readable } from 'stream';

export interface StorageProvider {
  readonly bucket: string;

  // Presign PUT for clients to upload
  presignPut(bucket: string, key: string, contentType: string, expiresIn: number): Promise<string>;
  presignedPutObject(bucket: string, key: string, expiresIn: number): Promise<string>;
  presignPutObject?(params: { bucket: string; key: string; contentType?: string; expiresIn: number }): Promise<{ url: string; key: string }>;

  // Presign GET for clients to download/view
  presignGet(bucket: string, key: string, expiresIn: number): Promise<string>;
  presignedGetObject(bucket: string, key: string, expiresIn: number, responseHeaders?: Record<string, string>): Promise<string>;

  // Put object - accept object param or (bucket, key, body, [size], [metadata])
  putObject(...args: any[]): Promise<void>;

  // Delete object - accept object param or (bucket, key)
  deleteObject(...args: any[]): Promise<void>;

  // Build a public URL if possible
  buildPublicUrl(bucket: string, key: string): string;
}
