import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthLibModule } from '@auth/auth-lib.module';
import { RewardModule } from './reward/reward.module';
import * as path from 'path';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserXp } from 'apps/course/src/quizs/entities/user-xp.entity';

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
      name: 'reward',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    TypeOrmModule.forRootAsync({
      name: 'course',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('COURSE_DATABASE_URL'),
        entities: [UserXp],
        synchronize: false,
      }),
    }),

    AuthLibModule,
    RewardModule,
  ],
})
export class RewardAppModule {}
