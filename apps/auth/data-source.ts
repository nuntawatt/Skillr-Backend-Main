import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/auth/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: false });

export const AuthDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [path.resolve(process.cwd(), 'apps/auth/src/**/*.entity{.ts,.js}')],
  migrations: [path.resolve(process.cwd(), 'apps/auth/migrations/*{.ts,.js}')],
  synchronize: false,
  logging: false,
});
