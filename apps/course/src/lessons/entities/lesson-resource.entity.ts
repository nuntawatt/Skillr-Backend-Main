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

  @ManyToOne(() => Lesson, lesson => lesson.resources, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @Column({ type: 'varchar', length: 50 })
  type: LessonResourceType;

  @Column({ nullable: true })
  title?: string;

  @Column({ name: 'media_asset_id', type: 'int', nullable: true })
  mediaAssetId?: number | null; // ✅ PDF file ID

  @Column({ type: 'json', nullable: true })
  meta?: {
    pages?: number;
    size?: number;
  };

  @Column({ nullable: true })
  position?: number;
}

