import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { Lesson } from '../../lessons/entities/lesson.entity';

@Entity('articles')
export class Article {
    @PrimaryGeneratedColumn()
    article_id: number;

    @OneToOne(() => Lesson, (lesson) => lesson.lesson_article, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'lesson_id' })
    lesson_id: number;

    @Column({ name: 'pdf_article', type: 'bytea', nullable: true })
    pdfArticle?: Buffer;

    @Column({ name: 'article_image_id', type: 'int', nullable: true })
    article_imageId?: number | null;

    // rich content: JSONB for editor content (blocks) or markdown HTML
    @Column({ type: 'jsonb', nullable: false })
    article_content: any;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}
