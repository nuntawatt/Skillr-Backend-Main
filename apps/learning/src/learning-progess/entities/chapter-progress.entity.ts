import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('chapter_progress')
@Unique(['userId', 'chapterId'])
export class ChapterProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  chapterId: number;

  @Column({ type: 'int', default: 0 })
  progressPercentage: number;

  @Column({ type: 'int', default: 0 })
  totalItems: number;

  @Column({ type: 'int', default: 0 })
  completedItems: number;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  lastUpdated: Date;
}
