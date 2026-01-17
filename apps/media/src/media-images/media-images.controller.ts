// media-images.controller.ts
import { Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { MediaImagesService } from './media-images.service';
import { UploadImageDto } from './dto/upload-image.dto';

@Controller('media/images')
export class MediaImagesController {
  constructor(private readonly svc: MediaImagesService) {}

  // server upload
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadImage(@UploadedFile() file: Express.Multer.File, @Body() body: Record<string, any>) {
    const ownerUserId = body?.owner_user_id ? Number(body.owner_user_id) : undefined;
    return this.svc.uploadImageFileAndPersist(file, ownerUserId);
  }

  // client request presigned PUT to upload directly to storage
  @Post('presign')
  createPresign(@Body() dto: { original_filename: string; content_type: string; size_bytes?: number; owner_user_id?: number }) {
    return this.svc.createPresignedUpload(dto, dto.owner_user_id);
  }

  // get presigned GET url for viewing
  @Get('presign/:key')
  getPresign(@Param('key') key: string) {
    return this.svc.getPresignedImageByKey(key);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.svc.deleteImageById(Number(id));
  }
}
