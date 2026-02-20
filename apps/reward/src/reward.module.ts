import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthLibModule } from '@auth/auth-lib.module';
import { RewardModule } from './reward/reward.module';
import * as path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(process.cwd(), 'apps/stock/.env'),
        path.resolve(process.cwd(), '.env'),
      ],
    }),
    AuthLibModule,
    RewardModule,
  ],
})
export class StockAppModule {}
