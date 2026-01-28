import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
<<<<<<< HEAD
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/course/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: false });

export const CourseDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [path.resolve(process.cwd(), 'apps/course/src/**/*.entity{.ts,.js}')],
  migrations: [path.resolve(process.cwd(), 'apps/course/migrations/*{.ts,.js}')],
  synchronize: false,
  logging: false,
});

// Export only the named DataSource instance. Do not export a default to
// satisfy TypeORM CLI requirement of a single DataSource export.
=======
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
>>>>>>> wave-service-quizs-learning
