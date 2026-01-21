import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MinioStorageService } from './minio.service';
import { AwsService } from './aws.service';
import { StorageFactory } from './storage.factory';

@Module({
  imports: [ConfigModule],
  providers: [MinioStorageService, AwsService, StorageFactory],
  exports: [MinioStorageService, AwsService, StorageFactory],
})
export class StorageModule {}
