import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, Index } from 'typeorm';
import { Level } from '../../levels/entities/level.entity';
import { Lesson } from '../../lessons/entities/lesson.entity';

@Entity('chapters')
@Index('idx_chapters_level_id', ['levelId'])
export class Chapter {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column({ name: 'order_index', type: 'int', default: 0 })
    orderIndex: number;

    @ManyToOne(() => Level, (level) => level.chapters, { onDelete: 'CASCADE' })
    level: Level;

    @Column({ name: 'level_id', type: 'int' })
    levelId: number;

    @OneToMany(() => Lesson, (lesson) => lesson.chapter, { cascade: true })
    lessons: Lesson[];
}
