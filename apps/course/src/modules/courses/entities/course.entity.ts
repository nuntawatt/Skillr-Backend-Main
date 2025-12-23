import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'owner_user_id' })
  ownerUserId: number;

  @Column()
  title: string;

  @Column({ name: 'short_description', type: 'text', nullable: true })
  shortDescription?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'int', default: 0 })
  price: number;

  @Column({ name: 'is_published', default: false })
  isPublished: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
