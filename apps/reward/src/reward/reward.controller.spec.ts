import { Test, TestingModule } from '@nestjs/testing';
import { RewardController } from './reward.controller';
import { RewardService } from './reward.service';

describe('RewardController', () => {
  let controller: RewardController;
  let service: RewardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RewardController],
      providers: [
        {
          provide: RewardService,
          useValue: {
            redeemReward: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RewardController>(RewardController);
    service = module.get<RewardService>(RewardService);
  });

  it('should call redeemReward', async () => {
    jest.spyOn(service, 'redeemReward').mockResolvedValue({
        message: 'Redeem success',
        data: {} as any,
    });

    const result = await controller.redeemReward('uuid-1', 1);

    expect(result).toEqual({
        message: 'Redeem success',
        data: {},
    });
    expect(service.redeemReward).toHaveBeenCalledWith('uuid-1', 1);
  });
});
