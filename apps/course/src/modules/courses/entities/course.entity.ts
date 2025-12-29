import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'owner_user_id' })
  ownerUserId: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'int', default: 0 })
  price: number;

  @Column({ name: 'is_published', default: false })
  isPublished: boolean;

  @Column({ name: 'category_id', type: 'int', nullable: true })
  categoryId?: number;

  @Column({ name: 'level', type: 'varchar', length: 20, default: 'beginner' })
  level: string;

  @Column({ type: 'text', array: true, nullable: true })
  tags?: string[];

  @Column({ name: 'cover_media_asset_id', type: 'int', nullable: true })
  coverMediaAssetId?: number;

  @Column({ name: 'intro_media_asset_id', type: 'int', nullable: true })
  introMediaAssetId?: number;

  @Column({ name: 'duration_seconds', type: 'int', default: 0 })
  durationSeconds: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
