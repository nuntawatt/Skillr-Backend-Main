import { Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUserId, JwtAuthGuard, Roles, RolesGuard } from '@auth';
import { UserRole } from '@common/enums';
import { AssetLibraryService } from './asset-library.service';
import { CreateAssetVideoDto, UpdateAssetImageDto, UpdateAssetVideoDto } from './dto';

@ApiTags('Asset Library')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('asset-library')
export class AssetLibraryController {
    constructor(private readonly svc: AssetLibraryService) { }

    @Post('image/upload')
    @ApiOperation({ summary: 'อัพโหลดภาพเข้า Asset Library' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary', description: 'Image file to upload' },
            },
            required: ['file'],
        },
    })
    @ApiResponse({ status: 201, description: 'Image uploaded successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: multer.memoryStorage(),
            limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
        }),
    )
    async uploadAssetImage(
        @CurrentUserId() adminId: string,
        @UploadedFile() file: Express.Multer.File,
    ) {
        return this.svc.uploadAssetImage(adminId, file);
    }

    @Post('video/upload')
    @ApiOperation({ summary: 'สร้าง Presigned URL สำหรับอัปโหลดวิดีโอเข้า Asset Library' })
    @ApiBody({ type: CreateAssetVideoDto })
    @ApiResponse({ status: 201, description: 'Presigned URL created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input or file size exceeds limit' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async presignAssetVideo(
        @CurrentUserId() adminId: string,
        @Body() dto: CreateAssetVideoDto,
    ) {
        return this.svc.createAssetVideoPresign(adminId, dto);
    }

    @Post('video/:id/confirm')
    @ApiOperation({ summary: 'ยืนยันวิดีโอใน Asset Library หลังอัปโหลดเสร็จ' })
    @ApiResponse({ status: 200, description: 'Confirmed' })
    @ApiResponse({ status: 400, description: 'File not uploaded yet' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Video not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async confirmAssetVideo(@Param('id') id: string) {
        return this.svc.confirmAssetVideo(Number(id));
    }


    @Get('image')
    @ApiOperation({ summary: 'ดึงรายการภาพจาก Asset Library ทั้งหมด' })
    @ApiResponse({ status: 200, description: 'List of images retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'No images found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async getAssetImagesAll() {
        return this.svc.getAssetImagesAll();
    }

    @Get('image/:id')
    @ApiOperation({ summary: 'ดึงรายละเอียดภาพจาก Asset Library ตาม ID' })
    @ApiResponse({ status: 200, description: 'Image retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Image not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async getAssetImageById(@Param('id') id: string) {
        return this.svc.getAssetImageById((Number(id)));
    }

    @Get('video')
    @ApiOperation({ summary: 'ดึงรายการวิดีโอจาก Asset Library ทั้งหมด' })
    @ApiResponse({ status: 200, description: 'List of videos retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'No videos found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async getAssetVideosAll() {
        return this.svc.getAssetVideosAll();
    }

    @Get('video/:id')
    @ApiOperation({ summary: 'ดึงรายละเอียดวิดีโอจาก Asset Library ตาม ID' })
    @ApiResponse({ status: 200, description: 'Video retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Video not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async getAssetVideoById(@Param('id') id: string) {
        return this.svc.getAssetVideoById(Number(id));
    }

    @Patch('image/:id')
    @ApiOperation({ summary: 'อัปเดตข้อมูลภาพใน Asset Library ตาม ID' })
    @ApiBody({ type: UpdateAssetImageDto })
    @ApiResponse({ status: 200, description: 'Image updated successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Image not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async updateAssetImage(@Param('id') id: string, @Body() dto: UpdateAssetImageDto) {
        return this.svc.updateAssetImage(Number(id), dto);
    }

    @Patch('video/:id')
    @ApiOperation({ summary: 'อัปเดตข้อมูลวิดีโอใน Asset Library ตาม ID' })
    @ApiBody({ type: UpdateAssetVideoDto })
    @ApiResponse({ status: 200, description: 'Video updated successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Video not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async updateAssetVideo(@Param('id') id: string, @Body() dto: UpdateAssetVideoDto) {
        return this.svc.updateAssetVideo(Number(id), dto);
    }

    @Delete('image/:id')
    @ApiOperation({ summary: 'ลบภาพจาก Asset Library ตาม ID' })
    @ApiResponse({ status: 200, description: 'Image deleted successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Image not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async deleteAssetImage(@Param('id') id: string) {
        return this.svc.deleteAssetImageById(Number(id));
    }

    @Delete('video/:id')
    @ApiOperation({ summary: 'ลบวิดีโอจาก Asset Library ตาม ID' })
    @ApiResponse({ status: 200, description: 'Video deleted successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Video not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    async deleteAssetVideo(@Param('id') id: string) {
        return this.svc.deleteAssetVideoById(Number(id));
    }
}