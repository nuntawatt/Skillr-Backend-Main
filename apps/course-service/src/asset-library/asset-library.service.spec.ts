import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AssetLibraryService } from './asset-library.service';
import { AwsS3StorageService } from '../storage/aws.service';
import { AssetMedia, AssetMediaStatus, AssetMediaType } from './entities/asset-media.entity';

describe('AssetLibraryService', () => {
  let service: AssetLibraryService;

  type AwsS3StorageServiceMock = {
    putObject: jest.Mock;
    presignPut: jest.Mock;
    buildPublicUrl: jest.Mock;
    fileExists: jest.Mock;
    deleteObject: jest.Mock;
  };

  type AssetMediaRepoMock = {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };

  let aws: AwsS3StorageServiceMock;
  let repo: AssetMediaRepoMock;

  const makeAsset = (overrides: Partial<AssetMedia> = {}): AssetMedia =>
    ({
      assetMediaId: 1,
      adminId: 'a1',
      type: AssetMediaType.IMAGE,
      originalFilename: 'x.png',
      mimeType: 'image/png',
      sizeBytes: '10',
      publicUrl: 'https://cdn/x',
      status: AssetMediaStatus.READY,
      createdAt: new Date('2026-03-05T00:00:00.000Z'),
      updatedAt: new Date('2026-03-05T00:00:00.000Z'),
      thumbnailUrl: null as any,
      durationSeconds: null as any,
      ...overrides,
    }) as AssetMedia;

  const envBackup = { ...process.env };

  beforeEach(async () => {
    process.env = { ...envBackup, AWS_S3_BUCKET: 'bucket1' };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetLibraryService,
        {
          provide: AwsS3StorageService,
          useValue: {
            putObject: jest.fn(),
            presignPut: jest.fn().mockResolvedValue('https://presign'),
            buildPublicUrl: jest.fn((bucket: string, key: string) => `https://cdn/${bucket}/${key}`),
            fileExists: jest.fn(),
            deleteObject: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AssetMedia),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AssetLibraryService);
    aws = module.get(AwsS3StorageService);
    repo = module.get(getRepositoryToken(AssetMedia));
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = envBackup;
  });

  describe('uploadAssetImage', () => {
    it('throws when file missing', async () => {
      await expect(service.uploadAssetImage('a1', null as any)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('uploads image and saves', async () => {
      const file = {
        mimetype: 'image/png',
        originalname: 'x.png',
        size: 10,
        buffer: Buffer.from('x'),
      } as any;

      repo.create!.mockImplementation((x: any) => x);
      repo.save!.mockResolvedValue(makeAsset({ assetMediaId: 99, type: AssetMediaType.IMAGE }));

      const res = await service.uploadAssetImage('a1', file);

      expect(aws.putObject).toHaveBeenCalled();
      expect(res.assetMediaId).toBe(99);
      expect(res.type).toBe(AssetMediaType.IMAGE);
    });
  });

  describe('createAssetVideoPresign', () => {
    it('creates presign and saves UPLOADING asset', async () => {
      repo.create!.mockImplementation((x: any) => x);
      repo.save!.mockResolvedValue(makeAsset({ assetMediaId: 88, type: AssetMediaType.VIDEO, status: AssetMediaStatus.UPLOADING }));

      const res = await service.createAssetVideoPresign('a1', { mime_type: 'video/mp4', size_bytes: 10, original_filename: 'x.mp4' } as any);

      expect(aws.presignPut).toHaveBeenCalled();
      expect(res.assetMediaId).toBe(88);
      expect(res.status).toBe(AssetMediaStatus.UPLOADING);
    });
  });

  describe('confirmAssetVideo', () => {
    it('throws when not found', async () => {
      repo.findOne!.mockResolvedValue(null);
      await expect(service.confirmAssetVideo(1)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws when status not UPLOADING', async () => {
      repo.findOne!.mockResolvedValue(makeAsset({ assetMediaId: 1, type: AssetMediaType.VIDEO, status: AssetMediaStatus.READY }));
      await expect(service.confirmAssetVideo(1)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('marks READY when file exists', async () => {
      const asset = makeAsset({ assetMediaId: 1, type: AssetMediaType.VIDEO, status: AssetMediaStatus.UPLOADING, publicUrl: 'https://cdn/bucket1/library-videos/k' });
      repo.findOne!.mockResolvedValue(asset);
      (aws.fileExists as jest.Mock).mockResolvedValue(true);
      repo.save!.mockResolvedValue(asset);

      const res = await service.confirmAssetVideo(1);
      expect(res.success).toBe(true);
      expect(asset.status).toBe(AssetMediaStatus.READY);
    });
  });

  describe('getAssetLibraryAll', () => {
    it('throws when no assets', async () => {
      repo.find!.mockResolvedValue([]);
      await expect(service.getAssetLibraryAll()).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns list', async () => {
      repo.find!.mockResolvedValue([makeAsset({ assetMediaId: 1 })]);
      const res = await service.getAssetLibraryAll();
      expect(res).toHaveLength(1);
    });
  });

  describe('getAssetById', () => {
    it('throws when not found', async () => {
      repo.findOne!.mockResolvedValue(null);
      await expect(service.getAssetById(1)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateAssetImage / updateAssetVideo', () => {
    it('updateAssetImage throws when not found', async () => {
      repo.findOne!.mockResolvedValue(null);
      await expect(service.updateAssetImage(1, { original_filename: 'x' } as any)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updateAssetVideo throws when not found', async () => {
      repo.findOne!.mockResolvedValue(null);
      await expect(service.updateAssetVideo(1, { original_filename: 'x' } as any)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteAssetById', () => {
    it('throws when not found', async () => {
      repo.findOne!.mockResolvedValue(null);
      await expect(service.deleteAssetById(1)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws when missing publicUrl', async () => {
      repo.findOne!.mockResolvedValue(makeAsset({ assetMediaId: 1, publicUrl: null as any }));
      await expect(service.deleteAssetById(1)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deletes from s3 and deletes record', async () => {
      repo.findOne!.mockResolvedValue(makeAsset({ assetMediaId: 1, publicUrl: 'https://cdn/bucket1/library-images/k' }));
      repo.delete!.mockResolvedValue({} as any);

      const res = await service.deleteAssetById(1);

      expect(aws.deleteObject).toHaveBeenCalled();
      expect(repo.delete).toHaveBeenCalledWith({ assetMediaId: 1 });
      expect(res.message).toContain('Asset deleted successfully');
    });
  });
});
