import { Module } from '@nestjs/common';
import { AdminService } from './reward-admin.service';
import { AdminController } from './reward-admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reward } from '../reward/entities/rewards.entity';

@Module({
  imports:[TypeOrmModule.forFeature([Reward])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
