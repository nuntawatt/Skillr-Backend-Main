import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthLibModule } from '@auth/auth-lib.module';

import { LearningProgressModule } from './learning-progess/learning-progress.module';
import { getLearningDatabaseConfig } from '../database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/learning/.env', '.env'],
    }),

    // 🔹 DB: learning
    TypeOrmModule.forRootAsync({
      name: 'learning',
      imports: [ConfigModule],
      useFactory: getLearningDatabaseConfig,
      inject: [ConfigService],
    }),

    AuthLibModule,
    LearningProgressModule,
  ],
})
export class AppModule {}
