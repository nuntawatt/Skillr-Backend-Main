import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';

@Entity('courses')
@Index('idx_courses_owner_user_id', ['ownerUserId'])
@Index('idx_courses_is_published', ['isPublished'])
@Index('idx_courses_category_id', ['categoryId'])
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'owner_user_id', type: 'int' })
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

  @Column({
    name: 'level',
    type: 'enum',
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner',
  })
  level: 'beginner' | 'intermediate' | 'advanced';

  @Column({ type: 'simple-array', default: '' })
  tags: string[];

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