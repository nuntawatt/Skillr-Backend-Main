import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/course/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: false });

export const CourseDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    path.resolve(process.cwd(), 'apps/course/src/**/*.entity{.ts,.js}'),
  ],
  migrations: [
    path.resolve(process.cwd(), 'apps/course/migrations/*{.ts,.js}'),
  ],
  synchronize: false,
  logging: false,
});

// Export only the named DataSource instance. Do not export a default to
// satisfy TypeORM CLI requirement of a single DataSource export.
