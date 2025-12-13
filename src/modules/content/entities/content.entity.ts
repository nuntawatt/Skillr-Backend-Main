import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Lesson } from '../../lessons/entities/lesson.entity';

export enum ContentType {
  VIDEO = 'video',
  DOCUMENT = 'document',
  IMAGE = 'image',
  AUDIO = 'audio',
  EMBED = 'embed',
  TEXT = 'text',
}

@Entity('contents')
export class Content {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({
    type: 'enum',
    enum: ContentType,
    default: ContentType.TEXT,
  })
  type: ContentType;

  @Column({ type: 'text', nullable: true })
  body: string;

  @Column({ nullable: true })
  fileUrl: string;

  @Column({ default: 0 })
  order: number;

  @Column()
  lessonId: string;

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
