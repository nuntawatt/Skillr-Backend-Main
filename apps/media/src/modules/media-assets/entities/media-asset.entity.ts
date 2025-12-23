import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MediaAssetType {
  VIDEO = 'video',
  FILE = 'file',
  IMAGE = 'image',
}

export enum MediaAssetStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
}

@Entity('media_assets')
export class MediaAsset {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'owner_user_id' })
  ownerUserId: number;

  @Column({
    type: 'enum',
    enum: MediaAssetType,
  })
  type: MediaAssetType;

  @Column({
    type: 'enum',
    enum: MediaAssetStatus,
    default: MediaAssetStatus.UPLOADING,
  })
  status: MediaAssetStatus;

  @Column({ name: 'original_filename', nullable: true })
  originalFilename?: string;

  @Column({ name: 'mime_type', nullable: true })
  mimeType?: string;

  @Column({ name: 'size_bytes', type: 'bigint', nullable: true })
  sizeBytes?: string;

  @Column({ name: 'storage_provider', nullable: true })
  storageProvider?: string;

  @Column({ name: 'storage_bucket', nullable: true })
  storageBucket?: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 1024, nullable: true })
  storageKey?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
