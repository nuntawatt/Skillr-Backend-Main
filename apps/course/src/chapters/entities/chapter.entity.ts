import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { Level } from '../../levels/entities/level.entity';
import { Lesson } from '../../lessons/entities/lesson.entity';

@Entity('chapters')
@Index('idx_chapters_level_id', ['levelId'])
export class Chapter {
  @PrimaryGeneratedColumn()
  chapter_id: number;

  @Column()
  chapter_title: string;

  @Column({ name: 'chapter_name', type: 'varchar', length: 100 })
  chapter_name: string;

  @Column({ name: 'chapter_type', type: 'varchar', length: 50 })
  chapter_type: string;

  @Column({ name: 'chapter_description', type: 'text', nullable: true })
  chapter_description?: string;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  chapter_orderIndex: number;

  @ManyToOne(() => Level, (level) => level.level_chapters, {
    onDelete: 'CASCADE',
  })
  level: Level;

  @Column({ name: 'level_id', type: 'int' })
  levelId: number;

  @OneToMany(() => Lesson, (lesson) => lesson.chapter, { cascade: true })
  lessons: Lesson[];
}
