import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController, AdminUsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, EmailVerificationToken]),
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
