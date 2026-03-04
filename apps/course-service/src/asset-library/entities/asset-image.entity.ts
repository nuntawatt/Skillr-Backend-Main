import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum AssetImageStatus {
  UPLOADING = 'uploading',
  READY = 'ready',
  FAILED = 'failed',
}

@Entity('asset_image_assets')
export class AssetImageAsset {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'admin_id', type: 'uuid' })
  adminId: string;

  @Column({ name: 'original_filename', type: 'varchar', length: 255, nullable: true })
  originalFilename?: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 255 })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes: string;

  @Column({ name: 'storage_provider', type: 'varchar', length: 32, default: 's3' })
  storageProvider: string;

  @Column({ name: 'storage_bucket', type: 'varchar', length: 255 })
  storageBucket: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 1024 })
  storageKey: string;

  @Column({ name: 'public_url', type: 'varchar', length: 2048, nullable: true })
  publicUrl?: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: AssetImageStatus.UPLOADING })
  status: AssetImageStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
