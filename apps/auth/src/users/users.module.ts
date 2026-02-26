import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { AuthAccount } from './entities/auth-account.entity';
import { AuthModule } from '../auth/auth.module';
import { UsersAdminController } from './users-admin.controller';
import { Course } from 'apps/course/src/courses/entities/course.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AuthAccount], 'auth'),
    TypeOrmModule.forFeature([Course], 'course'),
    HttpModule,
    ConfigModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController, UsersAdminController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
