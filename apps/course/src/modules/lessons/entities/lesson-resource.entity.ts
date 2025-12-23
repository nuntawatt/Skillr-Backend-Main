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

  @Column({ name: 'lesson_id' })
  lessonId: number;

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @Column({ type: 'varchar', length: 50 })
  type: LessonResourceType;

  @Column({ nullable: true })
  title?: string;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  url?: string;

  @Column({ name: 'filename', nullable: true })
  filename?: string;

  @Column({ name: 'mime_type', nullable: true })
  mimeType?: string;

  @Column({ name: 'media_asset_id', nullable: true })
  mediaAssetId?: number;

  @Column({ type: 'json', nullable: true })
  meta?: any;

  @Column({ nullable: true })
  position?: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
