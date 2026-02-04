import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('lesson_progress')
@Unique(['userId', 'lessonId'])
export class LessonProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'lesson_id', type: 'int' })
  lessonId: number;

  @Column({ name: 'completed_at', type: 'timestamptz' })
  completedAt: Date;
}
