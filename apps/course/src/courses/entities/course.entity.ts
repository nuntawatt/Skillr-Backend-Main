import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { Level } from '../../levels/entities/level.entity';

@Entity('courses')
@Index('idx_courses_owner_user_id', ['ownerUserId'])
@Index('idx_courses_is_published', ['isPublished'])
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'owner_user_id', type: 'int' })
  ownerUserId: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // keep cover reference only (media service id)
  @Column({ name: 'cover_media_asset_id', type: 'int', nullable: true })
  coverMediaAssetId?: number | null;

  @Column({ name: 'intro_media_asset_id', type: 'int', nullable: true })
  introMediaAssetId?: number | null;

  // estimated duration of whole course in seconds
  @Column({ name: 'estimate_time_seconds', type: 'int', default: 0 })
  estimateTimeSeconds: number;

  @Column({ name: 'is_published', default: false })
  isPublished: boolean;

  // keep categoryId if you need filtering; tags should be normalized later
  @Column({ name: 'category_id', type: 'int', nullable: true })
  categoryId?: number | null;

  @OneToMany(() => Level, (level) => level.course, { cascade: true })
  levels: Level[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
