import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AwsS3StorageService } from './aws.service';
import { StorageFactory } from './storage.factory';

@Module({
  imports: [ConfigModule],
  providers: [AwsS3StorageService, StorageFactory],
  exports: [AwsS3StorageService, StorageFactory],
})
export class StorageModule {}
