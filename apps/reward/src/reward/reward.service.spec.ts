import { Test, TestingModule } from '@nestjs/testing';
import { RewardService } from './reward.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Reward } from './entities/rewards.entity';
import { RewardRedemption } from './entities/reward-redemption';
import { UserXp } from 'apps/course/src/quizs/entities/user-xp.entity';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('RewardService', () => {
  let service: RewardService;
  let rewardRepo: Repository<Reward>;
  let redemptionRepo: Repository<RewardRedemption>;
  let userXpRepo: Repository<UserXp>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardService,
        {
          provide: getRepositoryToken(Reward,   'reward'),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RewardRedemption, 'reward'),
          useValue: {
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserXp, 'course'),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RewardService>(RewardService);
    rewardRepo = module.get(getRepositoryToken(Reward, 'reward'));
    redemptionRepo = module.get(getRepositoryToken(RewardRedemption, 'reward'));
    userXpRepo = module.get(getRepositoryToken(UserXp, 'course'));
  });

  describe('redeemReward', () => {
    it('should redeem reward successfully', async () => {
      const mockReward = { id: 1, cost: 100 };
      const mockUserXp = { userId: 'uuid-1', xp: 200 };

      jest.spyOn(rewardRepo, 'findOne').mockResolvedValue(mockReward as any);
      jest.spyOn(userXpRepo, 'findOne').mockResolvedValue(mockUserXp as any);
      jest.spyOn(redemptionRepo, 'save').mockResolvedValue({} as any);

      const result = await service.redeemReward('uuid-1', 1);

      expect(result).toBeDefined();
      expect(rewardRepo.findOne).toHaveBeenCalled();
      expect(userXpRepo.findOne).toHaveBeenCalled();
      expect(redemptionRepo.save).toHaveBeenCalled();
    });

    it('should throw if reward not found', async () => {
      jest.spyOn(rewardRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.redeemReward('uuid-1', 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if xp not enough', async () => {
      const mockReward = { id: 1, cost: 500 };
      const mockUserXp = { userId: 'uuid-1', xp: 100 };

      jest.spyOn(rewardRepo, 'findOne').mockResolvedValue(mockReward as any);
      jest.spyOn(userXpRepo, 'findOne').mockResolvedValue(mockUserXp as any);

      await expect(
        service.redeemReward('uuid-1', 1),
      ).rejects.toThrow(BadRequestException);
    });
  });
});