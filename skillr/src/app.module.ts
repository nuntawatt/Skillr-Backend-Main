import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getDatabaseConfig } from './config/database.config';

// Feature Modules
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { StudentsModule } from './modules/students/students.module';
import { InstructorsModule } from './modules/instructors/instructors.module';
import { CoursesModule } from './modules/courses/courses.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { ContentModule } from './modules/content/content.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { LearningModule } from './modules/learning/learning.module';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ActivitiesModule } from './modules/activities/activities.module';
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

    // Core Modules
    UsersModule,
    AuthModule,

    // Profile Modules
    StudentsModule,
    InstructorsModule,

    // Course Modules
    CoursesModule,
    LessonsModule,
    ContentModule,
    AssignmentsModule,
    LearningModule,

    // Transaction Modules
    EnrollmentsModule,
    PaymentsModule,

    // Other Modules
    ActivitiesModule,
    NotificationsModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule { }
