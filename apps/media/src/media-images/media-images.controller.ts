import { Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';

import { MediaImagesService } from './media-images.service';
import { CreateImageUploadDto } from './dto/create-image-upload.dto';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiExtraModels, ApiParam, ApiResponse } from '@nestjs/swagger';

@ApiTags('Media Images')
@ApiExtraModels(CreateImageUploadDto)
@Controller('media/images')
export class MediaImagesController {
  constructor(private readonly svc: MediaImagesService) { }

  @Post('upload')
  @ApiOperation({ summary: 'Upload image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Image file to upload' },
        owner_user_id: { type: 'number', description: 'Owner user ID of the image (optional)' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Image uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @UseInterceptors(FileInterceptor('file', {
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  }),
  )
  async upload(@UploadedFile() file: Express.Multer.File, @Body() dto: CreateImageUploadDto) {
    return this.svc.uploadImageFileAndPersist(file, dto.owner_user_id);
  }

  // get presigned GET url for viewing
  @Get('presign/:key')
  @ApiOperation({ summary: '[CLIENT] Get presigned URL for image viewing by storage key' })
  @ApiParam({ name: 'key', description: 'Storage key of the image', type: 'string' })
  @ApiResponse({ status: 200, description: 'Presigned URL retrieved' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  async getPresign(@Param('key') key: string) {
    return this.svc.getPresignedImageByKey(key);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete image by ID' })
  @ApiResponse({ status: 200, description: 'Image deleted' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  async delete(@Param('id') id: string) {
    return this.svc.deleteImageById(Number(id));
  }
}
