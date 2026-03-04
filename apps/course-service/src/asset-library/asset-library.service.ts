import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { AwsS3StorageService } from '../storage/aws.service';
import { AssetImage, AssetImageStatus } from './entities/asset-image.entity';
import { AssetVideo, AssetVideoStatus } from './entities/asset-video.entity';
import { CreateAssetVideoDto, UpdateAssetImageDto, UpdateAssetVideoDto } from './dto';

const IMAGE_MAX_SIZE = 30 * 1024 * 1024; // 30MB
const VIDEO_MAX_SIZE = 1 * 1024 * 1024 * 1024; // 1GB

@Injectable()
export class AssetLibraryService {
    constructor(
        private readonly aws: AwsS3StorageService,

        @InjectRepository(AssetImage)
        private readonly imageRepo: Repository<AssetImage>,

        @InjectRepository(AssetVideo)
        private readonly videoRepo: Repository<AssetVideo>,
    ) { }

    /* -------------------------------------------------------------------------- */
    /*                                   CONFIG                                   */
    /* -------------------------------------------------------------------------- */

    private getBucket(): string {
        const bucket = process.env.AWS_S3_BUCKET;
        if (!bucket) throw new BadRequestException('AWS_S3_BUCKET not configured');
        return bucket;
    }

    private buildStorageKey(prefix: string) {
        return `${prefix}/${randomUUID()}`;
    }

    /* -------------------------------------------------------------------------- */
    /*                                VALIDATION                                  */
    /* -------------------------------------------------------------------------- */

    private validateImageMime(mime: string, originalName?: string) {
        const ext = (originalName ?? '').split('.').pop()?.toLowerCase();

        const allowMime = [
            'image/jpeg',
            'image/png',
            'image/jpg',
            'image/pjpeg',
            'image/webp',
            'image/svg+xml',
        ];

        const allowExt = ['jpg', 'jpeg', 'png', 'webp', 'svg'];

        if (allowMime.includes(mime?.toLowerCase())) return;
        if ((mime === 'application/octet-stream' || !mime) && ext && allowExt.includes(ext)) return;

        throw new BadRequestException('invalid image mime type');
    }

    private validateVideoMime(mimeType: string, originalFilename?: string) {
        const normalizedMime = mimeType?.trim().toLowerCase();

        const allowMimes = ('video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,video/mpeg,application/octet-stream')
            .split(',')
            .map((x) => x.trim().toLowerCase());

        if (allowMimes.includes(normalizedMime)) return;

        const allowExt = (process.env.VIDEO_EXT_ALLOWLIST ?? 'mp4,webm,mov,avi,mkv,mpeg,mpg')
            .split(',')
            .map((x) => x.trim().toLowerCase());

        const ext = originalFilename?.split('.').pop()?.toLowerCase();

        if ((normalizedMime === 'application/octet-stream' || !normalizedMime) && ext && allowExt.includes(ext)) {
            return;
        }

        throw new BadRequestException(`mime type not allowed: ${mimeType}`);
    }

    /* -------------------------------------------------------------------------- */
    /*                                IMAGE UPLOAD                                */
    /* -------------------------------------------------------------------------- */

    async uploadAssetImage(adminId: string, file: Express.Multer.File) {
        if (!file) throw new BadRequestException('file missing');

        this.validateImageMime(file.mimetype, file.originalname);

        if (file.size > IMAGE_MAX_SIZE) {
            throw new BadRequestException('file too large');
        }

        const bucket = this.getBucket();
        const storageKey = this.buildStorageKey('library-images');

        await this.aws.putObject(bucket, storageKey, file.buffer, file.size, file.mimetype);

        const publicUrl = this.aws.buildPublicUrl(bucket, storageKey);

        const asset = await this.imageRepo.save(
            this.imageRepo.create({
                adminId,
                originalFilename: file.originalname,
                mimeType: file.mimetype,
                sizeBytes: String(file.size),
                publicUrl,
                status: AssetImageStatus.READY,
            }),
        );

        return {
            assetImageId: asset.assetImageId,
            url: asset.publicUrl,
            status: asset.status,
        };
    }

    /* -------------------------------------------------------------------------- */
    /*                                VIDEO PRESIGN URL                           */
    /* -------------------------------------------------------------------------- */

    async createAssetVideoPresign(adminId: string, dto: CreateAssetVideoDto) {
        this.validateVideoMime(dto.mime_type, dto.original_filename);

        if (dto.size_bytes > VIDEO_MAX_SIZE) {
            throw new BadRequestException('file size exceeds limit');
        }

        const bucket = this.getBucket();
        const storageKey = this.buildStorageKey('library-videos');

        const uploadUrl = await this.aws.presignPut(bucket, storageKey, dto.mime_type, 60 * 15);

        const publicUrl = this.aws.buildPublicUrl(bucket, storageKey);

        const asset = await this.videoRepo.save(
            this.videoRepo.create({
                adminId,
                originalFilename: dto.original_filename ?? storageKey,
                mimeType: dto.mime_type,
                sizeBytes: String(dto.size_bytes),
                // durationSeconds: dto.duration_seconds,
                // thumbnailUrl: dto.thumbnail_url,
                publicUrl,
                status: AssetVideoStatus.UPLOADING,
            }),
        );

        return {
            assetVideoId: asset.assetVideoId,
            uploadUrl,
            publicUrl,
            status: asset.status,
        };
    }

    /* -------------------------------------------------------------------------- */
    /*                              CONFIRM VIDEO UPLOAD                          */
    /* -------------------------------------------------------------------------- */

    async confirmAssetVideo(assetVideoId: number) {
        const asset = await this.videoRepo.findOne({ where: { assetVideoId } });

        if (!asset) {
            throw new NotFoundException('asset video not found');
        }

        if (asset.status !== AssetVideoStatus.UPLOADING) {
            throw new BadRequestException(`cannot confirm asset video with status ${asset.status}`);
        }

        const bucket = this.getBucket();

        if (!asset.publicUrl) {
            throw new BadRequestException('missing publicUrl');
        }

        const storageKey = decodeURIComponent(
            new URL(asset.publicUrl).pathname.replace(/^\//, ''),
        );

        const exists = await this.aws.fileExists(bucket, storageKey);

        if (!exists) {
            throw new BadRequestException('file not uploaded yet');
        }

        asset.status = AssetVideoStatus.READY;

        await this.videoRepo.save(asset);

        return {
            success: true,
            assetVideoId: asset.assetVideoId,
            publicUrl: asset.publicUrl,
            status: asset.status,
        };
    }

    async getAssetImagesAll() {
        const imageAssets = await this.imageRepo.find({
            order: { createdAt: 'DESC' },
        });
        if (!imageAssets || imageAssets.length === 0) {
            throw new NotFoundException('No images found');
        }

        return imageAssets;
    }

    async getAssetImageById(id: number) {
        const imageAsset = await this.imageRepo.findOne({ where: { assetImageId: id } });
        if (!imageAsset) {
            throw new NotFoundException('Image not found');
        }
        return imageAsset;
    }

    async getAssetVideosAll() {
        const videoAssets = await this.videoRepo.find({
            order: { createdAt: 'DESC' },
        });
        if (!videoAssets || videoAssets.length === 0) {
            throw new NotFoundException('No videos found');
        }
        return videoAssets;
    }

    async getAssetVideoById(id: number) {
        const videoAsset = await this.videoRepo.findOne({ where: { assetVideoId: id } });
        if (!videoAsset) {
            throw new NotFoundException('Video not found');
        }
        return videoAsset;
    }

    async updateAssetImage(id: number, dto: UpdateAssetImageDto) {
        const imageAsset = await this.imageRepo.findOne({
            where: { assetImageId: id },
        });

        if (!imageAsset) {
            throw new NotFoundException('Image not found');
        }

        Object.assign(imageAsset, {
            ...(dto.original_filename && { originalFilename: dto.original_filename }),
            ...(dto.public_url && { publicUrl: dto.public_url }),
            ...(dto.status && { status: dto.status }),
        });
        console.log('Updating asset image:', imageAsset);

        return this.imageRepo.save(imageAsset);
    }

    async updateAssetVideo(id: number, dto: UpdateAssetVideoDto) {
        const videoAsset = await this.videoRepo.findOne({
            where: { assetVideoId: id },
        });
        if (!videoAsset) {
            throw new NotFoundException('Video not found');
        }
        Object.assign(videoAsset, {
            ...(dto.original_filename && { originalFilename: dto.original_filename }),
            ...(dto.thumbnail_url && { thumbnailUrl: dto.thumbnail_url }),
            ...(dto.duration_seconds && { durationSeconds: dto.duration_seconds }),
            ...(dto.status && { status: dto.status }),
        });

        // console.log('Updating asset video:', videoAsset);
        return this.videoRepo.save(videoAsset);
    }

    async deleteAssetImageById(id: number): Promise<{ message: string }> {

        const imageAsset = await this.imageRepo.findOne({
            where: { assetImageId: id },
        });
        if (!imageAsset) {
            throw new NotFoundException('Image not found');
        }
        await this.imageRepo.remove(imageAsset);

        return { message: `Image deleted successfully : ${id}` };
    }

    async deleteAssetVideoById(id: number): Promise<{ message: string }> {
        const videoAsset = await this.videoRepo.findOne({
            where: { assetVideoId: id },
        });
        if (!videoAsset) {
            throw new NotFoundException('Video not found');
        }
        await this.videoRepo.remove(videoAsset);

        return { message: `Video deleted successfully : ${id}` };
    }
}