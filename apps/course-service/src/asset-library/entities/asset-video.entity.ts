import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum AssetVideoStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
}

@Entity('asset_video')
export class AssetVideo {
  @PrimaryGeneratedColumn()
  assetVideoId: number;

  @Column({ name: 'admin_id', type: 'uuid' })
  adminId: string;

  @Column({ name: 'original_filename', type: 'varchar', length: 255, nullable: true })
  originalFilename: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 255 })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes: string;

  @Column({ name: 'duration_seconds', type: 'integer', nullable: true })
  durationSeconds?: number;

  @Column({ name: 'thumbnail_url', type: 'varchar', length: 2048, nullable: true })
  thumbnailUrl?: string;

  @Column({ name: 'public_url', type: 'varchar', length: 2048, nullable: true })
  publicUrl: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: AssetVideoStatus.UPLOADING })
  status: AssetVideoStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
