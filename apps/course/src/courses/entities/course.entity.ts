import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { Level } from '../../levels/entities/level.entity';

@Entity('courses')
@Index('idx_courses_course_owner_id', ['course_ownerId'])
@Index('idx_courses_is_published', ['isPublished'])
export class Course {
  @PrimaryGeneratedColumn()
  course_id: number;

  @Column({ name: 'course_owner_id', type: 'int' })
  course_ownerId: number;

  @Column()
  course_title: string;

  @Column({ type: 'text', nullable: true })
  course_description?: string;

  // keep cover reference only (media service id)
  @Column({ name: 'course_image_id', type: 'int', nullable: true })
  course_imageId?: number | null;

  @Column({ name: 'course_tags', type: 'text', array: true, nullable: true })
  course_tags?: string[] | null;

  // @Column({ name: 'intro_media_asset_id', type: 'int', nullable: true })
  // introMediaAssetId?: number | null;

  @Column({ name: 'is_published', default: false })
  isPublished: boolean;

  @OneToMany(() => Level, (level) => level.course, { cascade: true })
  course_levels: Level[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
