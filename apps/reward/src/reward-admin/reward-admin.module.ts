import { Module } from '@nestjs/common';
import { AdminService } from './reward-admin.service';
import { AdminController } from './reward-admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reward } from '../reward/entities/rewards.entity';
import { StorageModule } from 'apps/course/src/storage/storage.module';

@Module({
  imports:[TypeOrmModule.forFeature([Reward], 'reward'), StorageModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
