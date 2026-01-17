// apps/media/src/storage/storage.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MinioStorageService } from './minio.service';
import { AwsStorageService } from './aws.service';
import { StorageFactory } from './storage.factory';

@Module({
  imports: [ConfigModule],
  providers: [MinioStorageService, AwsStorageService, StorageFactory],
  exports: [MinioStorageService, AwsStorageService, StorageFactory],
})
export class StorageModule {}
