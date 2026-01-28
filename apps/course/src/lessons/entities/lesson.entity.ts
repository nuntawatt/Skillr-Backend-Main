import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, Index } from 'typeorm';
import { Chapter } from '../../chapters/entities/chapter.entity';
import { Article } from '../../articles/entities/article.entity';

export enum LessonType {
  ARTICLE = 'article',
  VIDEO = 'video',
  QUIZ = 'quiz',
}

@Entity('lessons')
@Index('idx_lessons_chapter_id', ['chapter_id'])
export class Lesson {
  @PrimaryGeneratedColumn()
  lesson_id: number;

  @Column()
  lesson_title: string;

  @Column({ name: 'lesson_description', type: 'text', nullable: true })
  lesson_description?: string;

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

  @ManyToOne(() => Chapter, (chapter) => chapter.lessons, { onDelete: 'CASCADE' })
  chapter: Chapter;
  @Column({ name: 'chapter_id', type: 'int' })
  chapter_id: number;

  // ความสัมพันธ์กับบทความ (ถ้า lesson_type เป็น ARTICLE)
  @OneToMany(() => Article, (a) => a.lesson)
  lesson_articles: Article[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
