import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from '@config/database.config';
import { AuthLibModule } from '@auth/auth-lib.module';

import { ActivitiesModule } from './modules/activities/activities.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module';
import { LearningModule } from './modules/learning/learning.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
    AuthLibModule,
    ActivitiesModule,
    AssignmentsModule,
    EnrollmentsModule,
    LearningModule,
    NotificationsModule,
  ],
})
export class AppModule {}