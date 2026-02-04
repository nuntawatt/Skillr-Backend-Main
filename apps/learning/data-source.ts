import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { LessonProgress } from './src/learning-progress/entities/lesson-progress.entity';
import { ChapterProgress } from './src/learning-progress/entities/chapter-progress.entity';
import { ItemProgress } from './src/learning-progress/entities/item-progress.entity';

// Load environment variables
config({ path: 'apps/learning/.env' });

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_LEARNING_URL,
  synchronize: false,
  logging: true,
  entities: [LessonProgress, ChapterProgress, ItemProgress],
  migrations: ['apps/learning/src/migrations/*.ts'],
  subscribers: [],
});
