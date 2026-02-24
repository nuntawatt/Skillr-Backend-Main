import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { Reward } from './entities/rewards.entity';
import { Any, DataSource, Repository } from 'typeorm';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { RewardRedemption } from './entities/reward-redemption';
import { User } from 'apps/auth/src/users/entities';
import { UserXp } from 'apps/course/src/quizs/entities/user-xp.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class RewardService {
  constructor(
    @InjectDataSource('reward')
    private readonly rewardDataSource: DataSource,
    @InjectDataSource('course')
    private readonly courseDataSource: DataSource,
    @InjectRepository(Reward , 'reward')
    private readonly rewardRepository: Repository<Reward>,
    @InjectRepository(RewardRedemption , 'reward')
    private readonly redeemRepostory: Repository<RewardRedemption>,
    @InjectRepository(UserXp, 'course')
    private readonly userxpRepositoyry: Repository<UserXp>
  ){}


  getAllReward(){
    return this.rewardRepository.find()
  }

  async getRedeem(userId: string) {
    const redeem = await this.redeemRepostory.find({
      where: {
        userId: userId,
      },
      relations: ['reward'],
    });

    if (!redeem) {
      throw new NotFoundException('Redemption not found');   
    }

    return redeem;
  }

  async redeemReward(userId: string, rewardId: number) {
    const rewardQueryRunner = this.rewardDataSource.createQueryRunner();
    await rewardQueryRunner.connect();
    await rewardQueryRunner.startTransaction();

    try {
      const now = new Date();
      const reward = await rewardQueryRunner.manager.findOne(Reward, {
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

      if (reward.remain <= 0) {
        throw new BadRequestException('Reward out of stock');
      }

      const courseQueryRunner = this.courseDataSource.createQueryRunner();
      await courseQueryRunner.connect();
      await courseQueryRunner.startTransaction();

      try {
        const user = await courseQueryRunner.manager.findOne(UserXp, {
          where: { userId:  userId},
          lock: { mode: 'pessimistic_write' },
        });
        console.log( 'user in service : '+user?.xpTotal )

        const userTmp = await this.userxpRepositoyry.findOne({
          where: { userId: userId }
        })
        console.log('user in UserXp : '+userTmp)


        if (!user) {
          throw new BadRequestException('User not found');
        }

        if (user.xpTotal < reward.required_points) {
          throw new BadRequestException('Not enough points');
        }

        user.xpTotal -= reward.required_points;
        await courseQueryRunner.manager.save(user);

        await courseQueryRunner.commitTransaction();
      } catch (err) {
        await courseQueryRunner.rollbackTransaction();
        throw err;
      } finally {
        await courseQueryRunner.release();
      }

      if (reward.limit_per_user) {
        const count = await rewardQueryRunner.manager.count(RewardRedemption, {
          where: {
            userId,
            reward,
          },
        });

        if (count >= reward.limit_per_user) {
          throw new BadRequestException('Redeem limit exceeded');
        }
      }

      reward.remain -= 1;
      await rewardQueryRunner.manager.save(reward);
      const token = randomUUID();

      const redemption = rewardQueryRunner.manager.create(RewardRedemption, {
        userId,
        reward,
        used_points: Number(reward.required_points),
        expire_at: reward.redeem_end_date,
        redeem_token: token,
      });

      await rewardQueryRunner.manager.save(redemption);

      await rewardQueryRunner.commitTransaction();

      return {
        message: 'Redeem success',
        data: redemption,
      };
    } catch (error) {
      await rewardQueryRunner.rollbackTransaction();
      throw error;
    } finally {
      await rewardQueryRunner.release();
    }
  }

 // สำหรับดึง total XP ของ user (ใช้ในหน้า reward เพื่อแสดง XP ปัจจุบันของ user)
  async getUserTotalXp(userId: string): Promise<number> {
    const raw = await this.userxpRepositoyry
      .createQueryBuilder('ux')
      .select('COALESCE(SUM(ux.xpTotal), 0)', 'total')
      .where('ux.userId = :userId', { userId })
      .getRawOne<{ total: string }>();

    return Number(raw?.total ?? 0);
  }

}
