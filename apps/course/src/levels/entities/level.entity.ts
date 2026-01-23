import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, Index } from 'typeorm';
import { Course } from '../../courses/entities/course.entity';
import { Chapter } from '../../chapters/entities/chapter.entity';

@Entity('levels')
@Index('idx_levels_course_id', ['courseId'])
export class Level {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column({ name: 'order_index', type: 'int', default: 0 })
    orderIndex: number;

    @ManyToOne(() => Course, (course) => course.levels, { onDelete: 'CASCADE' })
    course: Course;

    @Column({ name: 'course_id', type: 'int' })
    courseId: number;

    @OneToMany(() => Chapter, (chapter) => chapter.level, { cascade: true })
    chapters: Chapter[];
}
