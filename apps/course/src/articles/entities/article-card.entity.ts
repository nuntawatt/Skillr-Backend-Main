import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Article } from './article.entity';

@Entity('article_cards')
export class ArticleCard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'article_id' })
  articleId: number;

  @ManyToOne(() => Article, (article) => article.cards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_id' })
  article: Article;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'media_url', type: 'varchar', length: 255, nullable: true })
  mediaUrl?: string;

  @Column({ name: 'sequence_order', type: 'int' })
  sequenceOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
