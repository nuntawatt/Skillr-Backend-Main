import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthLibModule } from '@auth/auth-lib.module';
import { RewardModule } from './reward/reward.module';
import * as path from 'path';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from '@config/database.config';
import { AdminModule } from './reward-admin/reward-admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(process.cwd(), 'apps/reward/.env'),
        path.resolve(process.cwd(), '.env'),
      ],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
    AuthLibModule,
    RewardModule,
    AdminModule,
  ],
})
export class RewardAppModule {}
