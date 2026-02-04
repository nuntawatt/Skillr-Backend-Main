import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

export enum ItemStatus {
  LOCKED = 'locked',
  CURRENT = 'current',
  COMPLETED = 'completed',
}

export enum ItemType {
  ARTICLE = 'article',
  VIDEO = 'video',
  QUIZ = 'quiz',
}

@Entity('item_progress')
@Unique(['userId', 'itemId'])
export class ItemProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'item_id', type: 'int' })
  itemId: number;

  @Column({ name: 'chapter_id', type: 'int' })
  chapterId: number;

  @Column({
    type: 'enum',
    enum: ItemStatus,
    default: ItemStatus.LOCKED,
  })
  status: ItemStatus;

  @Column({
    type: 'enum',
    enum: ItemType,
  })
  itemType: ItemType;

  @Column({ name: 'order_index', type: 'int' })
  orderIndex: number;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @Column({ name: 'time_spent_seconds', type: 'int', default: 0 })
  timeSpentSeconds: number;

  @Column({ name: 'quiz_skipped', type: 'boolean', default: false })
  quizSkipped: boolean;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
