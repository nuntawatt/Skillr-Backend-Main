import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Course } from '../../courses/entities/course.entity';
import { LessonResource } from './lesson-resource.entity';

@Entity('lessons')
export class Lesson {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ name: 'content_text', type: 'text', nullable: true })
  contentText?: string;

  @Column({ name: 'media_asset_id', type: 'int', nullable: true })
  mediaAssetId?: number | null;

  @Column({ name: 'position', type: 'int', default: 0 })
  position: number;

  // Allow null when lesson is not yet attached to a course
  // This avoids inserting a foreign-key value of 0 which may not exist
  @Column({ name: 'course_id', type: 'int', nullable: true })
  courseId?: number | null;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @OneToMany(() => LessonResource, (resource) => resource.lesson)
  resources: LessonResource[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
