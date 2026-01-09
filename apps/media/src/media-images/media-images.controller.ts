import { Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { MediaImagesService } from './media-images.service';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Media Images')
@Controller('media/images')
export class MediaImagesController {
  constructor(private readonly svc: MediaImagesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  @ApiOperation({ summary: 'Upload an image file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        owner_user_id: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Image uploaded' })
  uploadImage(@UploadedFile() file: Express.Multer.File, @Body() body: Record<string, unknown>) {
    const ownerUserId = body?.['owner_user_id'] ? Number(body['owner_user_id']) : undefined;
    return this.svc.uploadImageFileAndPersist(file, ownerUserId);
  }

  @Get('presign/:key')
  @ApiParam({ name: 'key', example: 'abc-uuid' })
  @ApiOperation({ summary: 'Stream an image by key' })
  async streamByKey(@Param('key') key: string, @Res() res: Response) {
    return this.svc.streamImageByKey(key, res);
  }
}
