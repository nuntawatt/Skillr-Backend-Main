import { Injectable } from '@nestjs/common';
import { MinioStorageService } from './minio.service';
import { AwsService } from './aws.service';
import { StorageProvider } from './storage.interface';

@Injectable()
export class StorageFactory {
  constructor(
    private readonly minio: MinioStorageService,
    private readonly aws: AwsService,
  ) {}

  // choose image provider (you can tweak logic to choose by env or by file type)
  image(): StorageProvider {
    const provider = (process.env.STORAGE_PROVIDER ?? 'minio').toLowerCase();
    if (provider === 's3' || provider === 'aws') return this.aws;
    return this.minio;
  }

  // choose video provider (maybe use S3 for large videos by default)
  video(): StorageProvider {
    const provider = (
      process.env.STORAGE_PROVIDER_VIDEO ??
      process.env.STORAGE_PROVIDER ??
      'minio'
    ).toLowerCase();
    if (provider === 's3' || provider === 'aws') return this.aws;
    return this.minio;
  }
}
