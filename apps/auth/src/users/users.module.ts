import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { AuthAccount } from './entities/auth-account.entity';
import { AuthModule } from '../auth/auth.module';
import { UsersAdminController } from './users-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AuthAccount]),
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController, UsersAdminController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
