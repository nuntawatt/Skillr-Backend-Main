import { Injectable } from '@nestjs/common';
import { CreateRewardAdminDto } from './dto/create-reward-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reward } from '../reward/entities/rewards.entity';

@Injectable()
export class AdminService {
  constructor(
      @InjectRepository(Reward)
      private rewardRepo: Repository<Reward>,
    ) {}

  async createReward(createRewardDto: CreateRewardAdminDto) {
    const rewardCreated = this.rewardRepo.create(createRewardDto);
    return await this.rewardRepo.save(rewardCreated);
  }

  // findAll() {
  //   return `This action returns all admin`;
  // }

  // findOne(id: number) {
  //   return `This action returns a #${id} admin`;
  // }

  // update(id: number, updateAdminDto: UpdateAdminDto) {
  //   return `This action updates a #${id} admin`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} admin`;
  // }
}
