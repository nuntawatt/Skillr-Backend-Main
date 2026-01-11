import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Lesson } from './lesson.entity';

export enum LessonResourceType {
  VIDEO = 'video',
  FILE = 'file',
  LINK = 'link',
  QUIZ = 'quiz',
  ASSIGNMENT = 'assignment',
}

@Entity('lesson_resources')
export class LessonResource {
  @PrimaryGeneratedColumn()
  id: number;

  // Relation is the single source of truth for lesson_id
  @ManyToOne(() => Lesson, lesson => lesson.resources, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @Column({ type: 'varchar', length: 50 })
  type: LessonResourceType;

  @Column({ nullable: true })
  title?: string;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  url?: string;

  @Column({ nullable: true })
  filename?: string;

  @Column({ name: 'mime_type', nullable: true })
  mimeType?: string;

  @Column({ name: 'media_asset_id', type: 'int', nullable: true })
  mediaAssetId?: number | null;

  @Column({ type: 'json', nullable: true })
  meta?: unknown;

  @Column({ nullable: true })
  position?: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
