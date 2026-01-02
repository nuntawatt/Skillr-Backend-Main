import { Body, Controller, Get, Param, Post, Redirect, UploadedFile, UseGuards, UseInterceptors, Res, } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '@auth';
import { UserRole } from '@common/enums';
import { MediaAssetsService } from './media-assets.service';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiParam, ApiResponse } from '@nestjs/swagger';

function parseOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return undefined; 
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

@ApiTags('Media Assets')
@Controller('media/assets')
export class MediaAssetsController {
  constructor(private readonly mediaAssetsService: MediaAssetsService) { }

  @Post('images/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload an image file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Image file to upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The image file to upload (binary form-data field)'
        },
        owner_user_id: {
          type: 'string',
          description: 'Owner user id (form field, numeric string)',
          example: '1',
        },
      },
      required: ['file'],
    },
  })

  @ApiResponse({ status: 201, description: 'Image uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  uploadImage(
    @UploadedFile('file') file: Express.Multer.File,
    @Body() body: Record<string, unknown>,
  ) {
    const ownerUserId = parseOptionalNumber(
      body?.['owner_user_id'] ?? body?.['ownerUserId'],
    );
    return this.mediaAssetsService.uploadImageFileAndPersist(file, ownerUserId);
  }

  // Stream the image through the API so the client does not need direct
<<<<<<< Updated upstream
  @Get('/images/presign/:id')
  async streamFilePublic(@Param('id') id: string, @Res() res: Response) {
    return this.mediaAssetsService.streamObjectByMediaAssetId(Number(id), res);
=======
  @Get('/images/presign/:key')
  @ApiOperation({ summary: 'Stream an image by its storage key' })
  @ApiParam({ 
    name: 'key', 
    example: 'images/44f6ea80-45a8-445c-bf2b-62abe443096b' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Presigned URL retrieved successfully' 
  })
  
  async streamImageByKey(@Param('key') key: string, @Res() res: Response) {
    return this.mediaAssetsService.streamImageByKey(key, res);
>>>>>>> Stashed changes
  }

  // Public (no-login) status check: ready or not
  @Get('status/public/:id')
  @ApiOperation({ summary: 'Get public status of a media asset' })
  @ApiParam({ 
    name: 'id', 
    example: '10'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Asset status' 
  })
  getStatusPublic(@Param('id') id: string) {
    return this.mediaAssetsService.getPublicAssetStatus(Number(id));
  }

  // ใช้สำหรับ Course service ตรวจว่า asset ready ก่อน attach
  @Get(':id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get media asset by ID (Admin)' })
  @ApiParam({ 
    name: 'id', 
    example: '10'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Media asset retrieved successfully' 
  })
  getOne(@Param('id') id: string) {
    return this.mediaAssetsService.getAsset(Number(id));
  }
}
