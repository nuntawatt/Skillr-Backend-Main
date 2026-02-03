import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

export enum LessonProgressStatus {
  COMPLETED = 'completed',
  CURRENT = 'current',
  LOCKED = 'locked',
}

@Entity('lesson_progress')
@Unique(['userId', 'lessonId'])
export class LessonProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  lessonId: number;

  @Column({
    type: 'enum',
    enum: LessonProgressStatus,
    default: LessonProgressStatus.LOCKED,
  })
  status: LessonProgressStatus;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date;

  @Column({ type: 'int', default: 0 })
  progressPercentage: number;

  @Column({ type: 'int', default: 0 })
  timeSpent: number; // ในวินาที

  @Column({ type: 'boolean', default: false })
  isSkipped: boolean;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  lastUpdated: Date;
}
