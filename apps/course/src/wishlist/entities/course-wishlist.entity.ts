import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('course_wishlist')
@Unique(['userId', 'courseId'])
@Index('idx_course_wishlist_user_id', ['userId'])
@Index('idx_course_wishlist_created_at', ['createdAt'])
export class CourseWishlist {
  @PrimaryGeneratedColumn({ name: 'wishlist_id', type: 'int' })
  wishlistId: number;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'course_id', type: 'int' })
  courseId: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
