import { QueryRunner, Repository } from "typeorm";
import { RewardService } from "./reward.service";
import { Reward } from "./entities/rewards.entity";
import { RewardRedemption } from "./entities/reward-redemption";
import { UserXp } from "apps/course/src/quizs/entities/user-xp.entity";
import { Test, TestingModule } from "@nestjs/testing";
import { getDataSourceToken, getRepositoryToken } from "@nestjs/typeorm";
import { BadRequestException, NotFoundException } from "@nestjs/common";

describe('RewardService', () => {
  let service: RewardService;
  let rewardRepo: Repository<Reward>;
  let redeemRepo: Repository<RewardRedemption>;
  let userXpRepo: Repository<UserXp>;

  const mockManager = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    release: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    manager: mockManager,
  } as unknown as QueryRunner;

  const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardService,
        {
          provide: getRepositoryToken(Reward, 'reward'),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RewardRedemption, 'reward'),
          useValue: {
            find: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserXp, 'course'),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getDataSourceToken('reward'),
          useValue: mockDataSource,
        },
        {
          provide: getDataSourceToken('course'),
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<RewardService>(RewardService);
    rewardRepo = module.get(getRepositoryToken(Reward, 'reward'));
    redeemRepo = module.get(getRepositoryToken(RewardRedemption, 'reward'));
    userXpRepo = module.get(getRepositoryToken(UserXp, 'course'));

    jest.clearAllMocks();
  });

  describe('getAllReward', () => {
    it('should return all rewards', async () => {
      const rewards = [{ id: 1 }, { id: 2 }] as Reward[];
      jest.spyOn(rewardRepo, 'find').mockResolvedValue(rewards);

      const result = await service.getAllReward();
      expect(result).toEqual(rewards);
    });
  });

  describe('getDetailReward', () => {
    it('should throw if reward id invalid', async () => {
      await expect(service.getDetailReward('1', 0))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should throw if reward not found', async () => {
      jest.spyOn(rewardRepo, 'findOne').mockResolvedValue(null);

      await expect(service.getDetailReward('1', 99))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should return reward with isCanRedeem true', async () => {
      const reward = { id: 1, limit_per_user: 2 } as Reward;

      jest.spyOn(rewardRepo, 'findOne').mockResolvedValue(reward);
      jest.spyOn(redeemRepo, 'count').mockResolvedValue(1);

      const result = await service.getDetailReward('1', 1);

      expect(result).toEqual({
        reward,
        isCanRedeem: true,
      });
    });
  });

  describe('getUserTotalXp', () => {
    it('should return total xp', async () => {
      const mockQB = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '150' }),
      };

      jest
        .spyOn(userXpRepo, 'createQueryBuilder')
        .mockReturnValue(mockQB as any);

      const result = await service.getUserTotalXp('user1');

      expect(result).toBe(150);
    });
  });

  describe('redeemReward', () => {
    it('should redeem successfully', async () => {
      const reward: Partial<Reward> = {
        id: 1,
        is_active: true,
        required_points: 100,
        redeem_start_date: new Date(),
        redeem_end_date: new Date(Date.now() + 100000),
        remain: 5,
        total_limit: 10,
        limit_per_user: 2,
        };

      const userXp = {
        userId: 'user1',
        xpTotal: 200,
      } as UserXp;


      (mockManager.findOne as jest.Mock)
        .mockResolvedValueOnce(reward)
        .mockResolvedValueOnce(userXp);

      (mockManager.count as jest.Mock).mockResolvedValue(0);
      (mockManager.save as jest.Mock).mockResolvedValue({});
      (mockManager.create as jest.Mock).mockReturnValue({ id: 1 });

      const result = await service.redeemReward('user1', 1);

      expect(result.message).toBe('Redeem success');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should rollback if error occurs', async () => {
      (mockManager.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.redeemReward('user1', 1))
        .rejects
        .toThrow();

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });
});