import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import type { Readable } from 'stream';

@Injectable()
export class StorageService {
    private readonly logger = new Logger(StorageService.name);
    private readonly client: Minio.Client;

    constructor(private readonly config: ConfigService) {
        const { endPoint, port, useSSL, accessKey, secretKey } = this.getMinioConfig();

        this.client = new Minio.Client({
            endPoint,
            port,
            useSSL,
            accessKey,
            secretKey,
        });
    }

    // Config helpers
    get bucket(): string {
        const bucket = this.config.get<string>('S3_BUCKET');
        if (!bucket) {
            throw new BadRequestException('S3_BUCKET is not configured');
        }
        return bucket;
    }

    private getMinioConfig() {
        const endpointRaw = this.config.get<string>('S3_ENDPOINT');
        const explicitHost = this.config.get<string>('MINIO_ENDPOINT');
        const explicitPort = this.config.get<string>('MINIO_PORT');
        const explicitUseSsl = this.config.get<string>('MINIO_USE_SSL');

        let endPoint = explicitHost ?? 'localhost';
        let port = explicitPort ? Number(explicitPort) : 9000;
        let useSSL = explicitUseSsl ? explicitUseSsl === 'true' : false;

        const endpoint = endpointRaw ? endpointRaw.trim().split(/\s+/)[0] : undefined;
        if (endpoint) {
            try {
                const url = new URL(endpoint);
                endPoint = url.hostname;
                if (url.port) port = Number(url.port);
                useSSL = url.protocol === 'https:';
            } catch {
                endPoint = endpoint;
            }
        }

        const accessKey =
            this.config.get<string>('S3_ACCESS_KEY_ID') ??
            this.config.get<string>('MINIO_ACCESS_KEY') ??
            '';
        const secretKey =
            this.config.get<string>('S3_SECRET_ACCESS_KEY') ??
            this.config.get<string>('MINIO_SECRET_KEY') ??
            '';

        if (!accessKey || !secretKey) {
            throw new BadRequestException('MinIO credentials are not configured');
        }

        return { endPoint, port, useSSL, accessKey, secretKey };
    }

    // Object operations
    async putObject(bucket: string, key: string, buffer: Buffer, size?: number, meta?: Record<string, string>) {
        await this.client.putObject(bucket, key, buffer, size ?? buffer.length, meta ?? {});
    }

    async getObject(bucket: string, key: string): Promise<Readable> {
        return new Promise((resolve, reject) => {
            this.client.getObject(bucket, key, (err, stream) => {
                if (err || !stream) {
                    reject(err ?? new Error('object not found'));
                    return;
                }
                resolve(stream as Readable);
            });
        });
    }

    async getPartialObject(bucket: string, key: string, start: number, length: number): Promise<Readable> {
        return new Promise((resolve, reject) => {
            this.client.getPartialObject(bucket, key, start, length, (err, stream) => {
                if (err || !stream) {
                    reject(err ?? new Error('partial object not found'));
                    return;
                }
                resolve(stream as Readable);
            });
        });
    }

    async presignedGetObject(bucket: string, key: string, expiresSeconds = 900): Promise<string> {
        return new Promise((resolve, reject) => {
            (this.client as any).presignedGetObject(bucket, key, expiresSeconds, (err: Error | null, url?: string) => {
                if (err || !url) {
                    reject(err ?? new Error('presign failed'));
                    return;
                }
                resolve(url);
            },
            );
        });
    }

    async removeObject(bucket: string, key: string) {
        try {
            await this.client.removeObject(bucket, key);
        } catch (e) {
            this.logger.warn(`removeObject failed ${bucket}/${key}: ${String(e)}`);
        }
    }

    // Utility
    buildPublicUrl(bucket: string, key: string): string | undefined {
        const baseRaw = this.config.get<string>('S3_PUBLIC_BASE_URL') ?? this.config.get<string>('S3_ENDPOINT');
        const base = baseRaw ? baseRaw.trim().split(/\s+/)[0] : undefined;
        if (!base) return undefined;
        const normalizedBase = base.replace(/\/$/, '');
        const normalizedKey = key.replace(/^\//, '');
        return `${normalizedBase}/${bucket}/${normalizedKey}`;
    }
}
