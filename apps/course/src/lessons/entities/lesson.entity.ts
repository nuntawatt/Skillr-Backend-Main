import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, Index, JoinColumn } from 'typeorm';
import { Chapter } from '../../chapters/entities/chapter.entity';
import { Article } from '../../articles/entities/article.entity';

export enum LessonType {
  ARTICLE = 'article',
  VIDEO = 'video',
  QUIZ = 'quiz',
  CHECKPOINT = 'checkpoint',
}

@Entity('lessons')
@Index('idx_lessons_chapter_id', ['chapter_id'])
export class Lesson {
  @PrimaryGeneratedColumn()
  lesson_id: number;

  @Column()
  lesson_title: string;

  @Column({ name: 'lesson_description', type: 'text', nullable: true })
  lesson_description?: string | null;

  @Column({
    type: 'enum',
    enum: LessonType,
    default: LessonType.ARTICLE,
  })
  lesson_type: LessonType;

  @Column({ name: 'ref_id', type: 'int' })
  ref_id: number;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;

  // cover image URL (CloudFront CDN)
  @Column({ name: 'lesson_image_url', type: 'varchar', length: 2048, nullable: true })
  lesson_ImageUrl?: string | null;

  // main video URL (CloudFront CDN)
  @Column({ name: 'lesson_video_url', type: 'varchar', length: 2048, nullable: true })
  lesson_videoUrl?: string | null;

  @ManyToOne(() => Chapter, (chapter) => chapter.lessons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chapter_id', referencedColumnName: 'chapter_id' })
  chapter: Chapter;
  @Column({ name: 'chapter_id', type: 'int' })
  chapter_id: number;

  // ความสัมพันธ์กับบทความ (ถ้า lesson_type เป็น ARTICLE)
  @OneToMany(() => Article, (a) => a.lesson)
  lesson_articles: Article[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
