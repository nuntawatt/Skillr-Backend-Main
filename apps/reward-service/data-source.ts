import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Reward } from './src/reward/entities/rewards.entity';
import { RewardRedemption } from './src/reward/entities/reward-redemption';


dotenv.config({
  path: path.resolve(process.cwd(), 'apps/reward-service/.env'),
});

export const RewardDataSource = new DataSource({
  
    type: 'postgres',
    url: process.env.DATABASE_URL,

   entities: [Reward, RewardRedemption],
  migrations: ['apps/reward-service/migrations/*.ts'],

  synchronize: false,
  logging: true,
});