import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ActivityType {
  WORKSHOP = 'workshop',
  WEBINAR = 'webinar',
  MEETUP = 'meetup',
  HACKATHON = 'hackathon',
  OTHER = 'other',
}

@Entity('activities')
export class Activity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ActivityType,
    default: ActivityType.OTHER,
  })
  type: ActivityType;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  onlineUrl: string;

  @Column({ type: 'timestamptz' })
  startDate: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endDate: Date;

  @Column({ nullable: true })
  capacity: number;

  @Column({ nullable: true })
  thumbnail: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
