import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { Lesson } from '../../lessons/entities/lesson.entity';

@Entity('articles')
export class Article {
    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => Lesson, (lesson) => lesson.article, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'lesson_id' })
    lesson: Lesson;

    @Column({ name: 'lesson_id', type: 'int', unique: true })
    lessonId: number;

    @Column({ name: 'pdf_article', type: 'bytea', nullable: true })
    pdfArticle?: Buffer;

    // rich content: JSONB for editor content (blocks) or markdown HTML
    @Column({ type: 'jsonb', nullable: false })
    content: any;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;
}
