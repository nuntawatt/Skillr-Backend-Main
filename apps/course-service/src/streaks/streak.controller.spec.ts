import { Test, TestingModule } from '@nestjs/testing';

import { StreakController } from './streak.controller';
import { StreakService } from './streak.service';

describe('StreakController', () => {
  let controller: StreakController;

  const streakService = {
    getStreak: jest.fn(),
    markRewardShown: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StreakController],
      providers: [{ provide: StreakService, useValue: streakService }],
    }).compile();

    controller = module.get(StreakController);
    jest.clearAllMocks();
  });

  describe('getStreak', () => {
    it('maps service result to response DTO', async () => {
      streakService.getStreak.mockResolvedValue({
        streak: {
          currentStreak: 2,
          longestStreak: 5,
          lastCompletedAt: new Date('2026-03-05T00:00:00.000Z'),
        },
        color: 'yellow',
        isReward: true,
        isFlameOn: true,
      });

      await expect(controller.getStreak('u1')).resolves.toEqual({
        currentStreak: 2,
        longestStreak: 5,
        lastCompletedAt: new Date('2026-03-05T00:00:00.000Z'),
        color: 'yellow',
        isReward: true,
        isFlameOn: true,
      });

      expect(streakService.getStreak).toHaveBeenCalledWith('u1');
    });

    it('propagates errors', async () => {
      streakService.getStreak.mockRejectedValue(new Error('boom'));
      await expect(controller.getStreak('u1')).rejects.toThrow('boom');
    });
  });

  describe('markRewardShown', () => {
    it('delegates to service and returns message', async () => {
      streakService.markRewardShown.mockResolvedValue(undefined);

      await expect(controller.markRewardShown('u1')).resolves.toEqual({
        message: 'Reward modal marked as shown',
      });

      expect(streakService.markRewardShown).toHaveBeenCalledWith('u1');
    });
  });
});
