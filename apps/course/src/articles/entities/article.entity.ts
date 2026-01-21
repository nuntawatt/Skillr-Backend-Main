import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('articles')
export class Article {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column({ name: 'pdf_key', length: 2048 })
    pdfKey: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;
}
