import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from apps/stock first, then project root (do not override root values)
dotenv.config({ path: path.resolve(process.cwd(), 'apps/stock/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: false });

// Determine whether running compiled code (in dist) or running from source
const isCompiled = __filename.includes(`${path.sep}dist${path.sep}`);

const entities = isCompiled
  ? [path.resolve(process.cwd(), 'dist/apps/stock/src/**/*.entity.js')]
  : [path.resolve(process.cwd(), 'apps/stock/src/**/*.entity{.ts,.js}')];

const migrations = isCompiled
  ? [path.resolve(process.cwd(), 'dist/apps/stock/migrations/*.js')]
  : [path.resolve(process.cwd(), 'apps/stock/migrations/*{.ts,.js}')];

export const StockDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities,
  migrations,
  synchronize: false,
  logging: false,
});

// Export only the named DataSource instance. Do not export a default to
// satisfy TypeORM CLI requirement of a single DataSource export.