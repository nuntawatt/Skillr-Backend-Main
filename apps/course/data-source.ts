import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/course/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: false });

export const CourseDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['apps/course/src/**/*.entity{.ts,.js}'],
  migrations: [
    'apps/course/src/migrations/*{.ts,.js}',
    'apps/course/migrations/*{.ts,.js}',
  ],
  synchronize: false,
  logging: false,
});