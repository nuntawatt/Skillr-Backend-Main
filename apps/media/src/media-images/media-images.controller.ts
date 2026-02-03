import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';

import { MediaImagesService } from './media-images.service';
import { CreateImageUploadDto } from './dto/create-image-upload.dto';

@ApiTags('Media Images')
@Controller('media/images')
export class MediaImagesController {
  constructor(private readonly svc: MediaImagesService) {}

  // ===== Upload image =====
  @Post('upload')
  @ApiOperation({ summary: 'Upload image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file to upload',
        },
        owner_user_id: {
          type: 'number',
          description: 'Owner user ID of the image (optional)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Image uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateImageUploadDto,
  ) {
    if (!file) throw new BadRequestException('file missing');
    // คืนค่าเป็น image_id ให้ frontend เอาไปใส่ใน article_content
    return this.svc.uploadImageFileAndPersist(file, dto?.owner_user_id);
  }

  // ===== Presign by image id =====
  @Get('presign/:id')
  @ApiOperation({ summary: 'Get presigned URL by image id' })
  @ApiParam({ name: 'id', description: 'Image asset id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Presigned URL retrieved' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  async getPresign(@Param('id') id: string) {
    return this.svc.getPresignedImageById(Number(id));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete image by ID' })
  @ApiParam({ name: 'id', description: 'Image asset id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Image deleted successfully' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  async delete(@Param('id') id: string) {
    return this.svc.deleteImageById(Number(id));
  }
}
