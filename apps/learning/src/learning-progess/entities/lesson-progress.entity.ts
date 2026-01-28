import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('lesson_progress')
@Unique(['userId', 'lessonId'])
export class LessonProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  lessonId: number;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'last_read_card_index', type: 'int', default: 0 })
  lastReadCardIndex: number;
}
