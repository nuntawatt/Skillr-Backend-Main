import { Injectable } from '@nestjs/common';
import { AwsS3StorageService } from './aws.service';
import { StorageProvider } from './storage.interface';

// เก็บ factory สำหรับจัดการ storage provider ต่างๆ (ปัจจุบันมีแค่ AWS S3 แต่ในอนาคตอาจเพิ่มอื่นๆ ได้)
@Injectable()
export class StorageFactory {
  constructor(private readonly aws: AwsS3StorageService) {}

  // เรียกใช้ storage provider สำหรับภาพ
  image(): StorageProvider {
    return this.aws;
  }

  // เรียกใช้ storage provider สำหรับวิดีโอ
  video(): StorageProvider {
    return this.aws;
  }

  // เรียกใช้ AWS S3 service โดยตรง (ถ้าจำเป็น)
  getAwsService(): AwsS3StorageService {
    return this.aws;
  }
}
