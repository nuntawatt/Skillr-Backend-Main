import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StreakController } from './streak.controller';
import { StreakService } from './streak.service';
import { UserStreak } from './entities/user-streak.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserStreak])],
  controllers: [StreakController],
  providers: [StreakService],
  exports: [StreakService],
})
export class StreakModule {}
