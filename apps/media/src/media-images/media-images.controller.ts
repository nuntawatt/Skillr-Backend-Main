import { Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors, Res, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { MediaImagesService } from './media-images.service';
import { UploadImageDto } from './dto/upload-image.dto';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiResponse, ApiParam, ApiCreatedResponse } from '@nestjs/swagger';

@ApiTags('Media Images')
@Controller('media/images')
export class MediaImagesController {
  constructor(private readonly svc: MediaImagesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  @ApiOperation({ summary: 'Upload an image file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadImageDto })
  @ApiCreatedResponse({ description: 'Image uploaded' })
  @ApiResponse({ status: 201, description: 'The image has been successfully uploaded.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  uploadImage(@UploadedFile() file: Express.Multer.File, @Body() body: Record<string, unknown>) {
    const ownerUserId = body?.['owner_user_id'] ? Number(body['owner_user_id']) : undefined;
    return this.svc.uploadImageFileAndPersist(file, ownerUserId);
  }

  @Get('presign/:key')
  @ApiParam({ name: 'key', example: 'abc-uuid' })
  @ApiOperation({ summary: 'Stream an image by key' })
  @ApiResponse({ status: 200, description: 'Image stream started' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async streamByKey(@Param('key') key: string, @Res() res: Response) {
    return this.svc.streamImageByKey(key, res);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', example: 10 })
  @ApiOperation({ summary: 'Delete an image asset by ID' })
  @ApiResponse({ status: 200, description: 'Image asset deleted' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Image asset not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async deleteImageById(@Param('id') id: string) {
    const assetId = Number(id);
    return this.svc.deleteImageById(assetId);
  }
}
