import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstructorsController } from './instructors.controller';
import { InstructorsService } from './instructors.service';
import { Instructor } from './entities/instructor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Instructor])],
  controllers: [InstructorsController],
  providers: [InstructorsService],
  exports: [InstructorsService]
})
export class InstructorsModule {}
