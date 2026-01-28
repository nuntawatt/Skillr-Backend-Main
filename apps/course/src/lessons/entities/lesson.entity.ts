import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne, CreateDateColumn, Index } from 'typeorm';
import { Chapter } from '../../chapters/entities/chapter.entity';
import { Article } from '../../articles/entities/article.entity';

export enum LessonType {
  ARTICLE = 'article',
  VIDEO = 'video',
  QUIZ = 'quiz',
  ASSIGNMENT = 'assignment',
  CHECKPOINT = 'checkpoint',
}

export enum LessonRefSource {
  COURSE = 'course', // article content stored in course service
  MEDIA = 'media',   // media service id
  QUIZ = 'quiz',     // quiz service id
}

@Entity('lessons')
@Index('idx_lessons_chapter_id', ['chapter_id'])
export class Lesson {
  @PrimaryGeneratedColumn()
  lesson_id: number;

  @Column()
  lesson_title: string;

  // short description (optional)
  @Column({ name: 'lesson_description', type: 'text', nullable: true })
  lesson_description?: string;

  @Column({
    type: 'enum',
    enum: LessonType,
    default: LessonType.ARTICLE,
  })
  type: LessonType;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  order_index: number;

  // where actual content lives and id of that resource
  @Column({
    name: 'ref_source',
    type: 'enum',
    enum: LessonRefSource,
    default: LessonRefSource.COURSE,
  })
  ref_source: LessonRefSource;

  @Column({ name: 'ref_id', type: 'int' })
  ref_id: number;

  @ManyToOne(() => Chapter, (chapter) => chapter.lessons, { onDelete: 'CASCADE' })
  chapter: Chapter;

  @Column({ name: 'chapter_id', type: 'int' })
  chapter_id: number;

  // ONE-TO-ONE optional link to Article only when type === 'article'
  @OneToOne(() => Article, (article) => article.lesson, { cascade: true })
  lesson_article?: Article;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
