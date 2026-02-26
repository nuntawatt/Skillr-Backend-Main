import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { Reward } from './entities/rewards.entity';
import { Any, DataSource, QueryRunner, Repository } from 'typeorm';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { RewardRedemption } from './entities/reward-redemption';
import { User } from 'apps/auth/src/users/entities';
import { UserXp } from 'apps/course/src/quizs/entities/user-xp.entity';
import { randomUUID } from 'crypto';
import { log } from 'console';
import { escape } from 'querystring';
import { stat } from 'fs';

@Injectable()
export class RewardService {
  constructor(
    @InjectDataSource('reward')
    private readonly rewardDataSource: DataSource,

    @InjectDataSource('course')
    private readonly courseDataSource: DataSource,

    @InjectRepository(Reward, 'reward')
    private readonly rewardRepository: Repository<Reward>,

    @InjectRepository(RewardRedemption, 'reward')
    private readonly redeemRepository: Repository<RewardRedemption>,

    @InjectRepository(UserXp, 'course')
    private readonly userxpRepository: Repository<UserXp>,
  ) {}

  getAllReward() {
    return this.rewardRepository.find();
  }

  async getDetailReward(userId : string ,rewardId: number) {
    const rewardRunner = this.rewardDataSource.createQueryRunner();
    if (!rewardId || rewardId <= 0) {
      throw new BadRequestException('Invalid reward id');
    }

    const reward = await this.rewardRepository.findOne({
      where: { id: rewardId },
    });

    if (!reward) {
      throw new NotFoundException(`Reward with id ${rewardId} not found`);
    }

    const count = await this.redeemRepository.count({
      where: {userId,
        reward: { id: reward.id }}
    })
    let status = true
    if (reward.limit_per_user !== null && count >= reward.limit_per_user) {
      status =  false
    }

    return { reward: reward , isCanRedeem: status  };
  }

  async getRedeem(userId: string) {
    const redeems = await this.redeemRepository.find({
      where: { userId },
      relations: ['reward'],
    });

    if (!redeems.length) {
      throw new NotFoundException('Redemption not found');
    }

    return redeems;
  }

  async getUserTotalXp(userId: string): Promise<number> {
    const raw = await this.userxpRepository
      .createQueryBuilder('ux')
      .select('COALESCE(SUM(ux.xpTotal), 0)', 'total')
      .where('ux.userId = :userId', { userId })
      .getRawOne<{ total: string }>();

    return Number(raw?.total ?? 0);
  }

  async redeemReward(userId: string, rewardId: number) {
    const rewardRunner = this.rewardDataSource.createQueryRunner();
    const courseRunner = this.courseDataSource.createQueryRunner();

    await rewardRunner.connect();
    await courseRunner.connect();

    await rewardRunner.startTransaction();
    await courseRunner.startTransaction();

    try {
      const reward = await this.validateReward(
        rewardRunner,
        rewardId,
      );

      const userXp = await this.validateUserXp(
        courseRunner,
        userId,
        reward.required_points,
      );

      await this.validateUserLimit(rewardRunner, userId, reward);
      userXp.xpTotal -= reward.required_points;
      await courseRunner.manager.save(userXp);

      if(reward.total_limit != null && reward.remain != null){
        reward.remain -= 1;
      }
      
      await rewardRunner.manager.save(reward);
      const redemption = rewardRunner.manager.create(
        RewardRedemption,
        {
          userId,
          reward,
          used_points: reward.required_points,
          expire_at: reward.redeem_end_date,
          redeem_token: randomUUID(),
        },
      );
      await rewardRunner.manager.save(redemption);
      await courseRunner.commitTransaction();
      await rewardRunner.commitTransaction();
      return {
        message: 'Redeem success',
        data: redemption,
      };
    } catch (error) {
      await courseRunner.rollbackTransaction();
      await rewardRunner.rollbackTransaction();
      throw error;
    } finally {
      await courseRunner.release();
      await rewardRunner.release();
    }
  }

  private async validateReward(
    runner: QueryRunner,
    rewardId: number,
  ): Promise<Reward> {
    const now = new Date();

    const reward = await runner.manager.findOne(Reward, {
      where: { id: rewardId, is_active: true },
      lock: { mode: 'pessimistic_write' },
    });

    if (!reward) {
      throw new BadRequestException('Reward not found');
    }

    if (
      (reward.redeem_start_date && now < reward.redeem_start_date) ||
      (reward.redeem_end_date && now > reward.redeem_end_date)
    ) {
      throw new BadRequestException('Reward not in redeem period');
    }
    if (reward.remain <= 0 && reward.remain != null) {
      throw new BadRequestException('Reward out of stock');
    }
    return reward;
  }

  private async validateUserXp(
    runner: QueryRunner,
    userId: string,
    requiredPoints: number,
  ): Promise<UserXp> {
    const user = await runner.manager.findOne(UserXp, {
      where: { userId },
      order: { createdAt: 'DESC' },
      lock: { mode: 'pessimistic_write' },
    });

    console.log(user);
    

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.xpTotal < requiredPoints) {
      throw new BadRequestException('Not enough points');
    }

    return user;
  }

  private async validateUserLimit(
    runner: QueryRunner,
    userId: string,
    reward: Reward,
  ) {
    if (reward.limit_per_user == null || reward.limit_per_user == 0) {
      return;
    }

    const count = await runner.manager.count(RewardRedemption, {
      where: {
        userId,
        reward: { id: reward.id },
      },
    });

    if (count >= reward.limit_per_user) {
      throw new BadRequestException('Redeem limit exceeded');
    }
  }

}
