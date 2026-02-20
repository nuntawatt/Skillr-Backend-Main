import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthLibModule } from '@auth/auth-lib.module';
import { RewardModule } from './reward/reward.module';
import * as path from 'path';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(process.cwd(), 'apps/reward/.env'),
        path.resolve(process.cwd(), '.env'),
      ],
    }),
    TypeOrmModule.forRootAsync({}),
    AuthLibModule,
    RewardModule,
  ],
})
export class RewardAppModule {}
