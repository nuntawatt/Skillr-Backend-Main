import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('chapter_progress')
@Unique(['userId', 'chapterId'])
export class ChapterProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'chapter_id', type: 'int' })
  chapterId: number;

  @Column({ name: 'total_items', type: 'int' })
  totalItems: number;

  @Column({ name: 'completed_items', type: 'int', default: 0 })
  completedItems: number;

  @Column({ name: 'progress_percentage', type: 'decimal', precision: 5, scale: 2, default: 0 })
  progressPercentage: number;

  @Column({ name: 'last_completed_item_id', type: 'int', nullable: true })
  lastCompletedItemId?: number;

  @Column({ name: 'current_item_id', type: 'int', nullable: true })
  currentItemId?: number;

  @Column({ name: 'checkpoint_unlocked', type: 'boolean', default: false })
  checkpointUnlocked: boolean;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
