import 'minio';

import type { Readable } from 'stream';

declare module 'minio' {
  interface Client {
    // Promise-style (some MinIO typings/versions)
    getObject(bucketName: string, objectName: string): Promise<Readable>;

    // Callback-style (MinIO runtime supports this)
    getObject(
      bucketName: string,
      objectName: string,
      cb: (err: Error | null, dataStream?: Readable) => void,
    ): void;

    // Promise-style
    getPartialObject(
      bucketName: string,
      objectName: string,
      offset: number,
      length?: number,
    ): Promise<Readable>;

    // Callback-style
    getPartialObject(
      bucketName: string,
      objectName: string,
      offset: number,
      length: number,
      cb: (err: Error | null, dataStream?: Readable) => void,
    ): void;
  }
}
