import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Course } from './src/courses/entities/course.entity';
import { Level } from './src/levels/entities/level.entity';
import { Chapter } from './src/chapters/entities/chapter.entity';
import { Lesson } from './src/lessons/entities/lesson.entity';
import { Article } from './src/articles/entities/article.entity';
import { ArticleCard } from './src/articles/entities/article-card.entity';

dotenv.config({ path: 'apps/course/.env' });

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false, // Always false for migrations
  logging: true,
  entities: [Course, Level, Chapter, Lesson, Article, ArticleCard],
  migrations: ['apps/course/src/migrations/*.ts'],
});
