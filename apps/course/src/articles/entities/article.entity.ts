import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Lesson } from '../../lessons/entities/lesson.entity';
import { ArticleCard } from './article-card.entity';

@Entity('articles')
export class Article {
    @PrimaryGeneratedColumn()
    article_id: number;

    @OneToOne(() => Lesson, (lesson) => lesson.lesson_article, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'lesson_id' })
    lesson: Lesson;

    @Column({ name: 'lesson_id', type: 'int', unique: true })
    lessonId: number;

    @Column({ name: 'pdf_article', type: 'bytea', nullable: true })
    pdfArticle?: Buffer;

    // rich content: JSONB for editor content (blocks) or markdown HTML
    @Column({ type: 'jsonb', nullable: true })
    content: any;

    @OneToMany(() => ArticleCard, (card) => card.article)
    cards: ArticleCard[];
    @Column({ type: 'jsonb', nullable: false })
    article_content: any;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}
