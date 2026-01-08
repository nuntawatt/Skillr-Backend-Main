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

  @Column({ type: 'timestamptz' })
  completedAt: Date;
}
