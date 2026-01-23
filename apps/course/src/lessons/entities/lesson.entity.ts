import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne, CreateDateColumn, Index } from 'typeorm';
import { Chapter } from '../../chapters/entities/chapter.entity';
import { Article } from '../../articles/entities/article.entity';

export enum LessonType {
  ARTICLE = 'article',
  VIDEO = 'video',
  QUIZ = 'quiz',
  ASSIGNMENT = 'assignment',
}

export enum LessonRefSource {
  COURSE = 'course', // article content stored in course service
  MEDIA = 'media',   // media service id
  QUIZ = 'quiz',     // quiz service id
}

@Entity('lessons')
@Index('idx_lessons_chapter_id', ['chapterId'])
export class Lesson {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  // short description (optional)
  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: LessonType,
    default: LessonType.ARTICLE,
  })
  type: LessonType;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;

  // where actual content lives and id of that resource
  @Column({
    name: 'ref_source',
    type: 'enum',
    enum: LessonRefSource,
    default: LessonRefSource.COURSE,
  })
  refSource: LessonRefSource;

  @Column({ name: 'ref_id', type: 'int' })
  refId: number;

  @ManyToOne(() => Chapter, (chapter) => chapter.lessons, { onDelete: 'CASCADE' })
  chapter: Chapter;

  @Column({ name: 'chapter_id', type: 'int' })
  chapterId: number;

  // ONE-TO-ONE optional link to Article only when type === 'article'
  @OneToOne(() => Article, (article) => article.lesson, { cascade: true })
  article?: Article;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
