import { Test, TestingModule } from '@nestjs/testing';
import { LearnerHomeService } from './learner-home.service';
import { LearnerHomeResponseDto } from './dto/learner-home-response.dto';

jest.mock(
  '@auth',
  () => ({
    JwtAuthGuard: class JwtAuthGuard {},
  }),
  { virtual: true },
);

 jest.mock('../progress/decorators/current-user-id.decorator', () => ({
   CurrentUserId: () => () => undefined,
 }));

const { LearnerHomeController } = require('./learner-home.controller');

describe('LearnerHomeController', () => {
  let controller: InstanceType<typeof LearnerHomeController>;
  let service: LearnerHomeService;

  const mockUserId = 'test-user-id';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LearnerHomeController],
      providers: [
        {
          provide: LearnerHomeService,
          useValue: {
            getHome: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InstanceType<typeof LearnerHomeController>>(LearnerHomeController);
    service = module.get<LearnerHomeService>(LearnerHomeService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHome', () => {
    it('should return learner home data', async () => {
      const mockHomeData: LearnerHomeResponseDto = {
        header: {
          userId: mockUserId,
          displayName: 'Test User',
          avatarUrl: 'https://example.com/avatar.jpg',
          xp: 150,
          streakDays: 5,
        },
        continueLearning: {
          courseId: 1,
          courseTitle: 'Test Course',
          lessonId: 1,
          lessonTitle: 'Test Lesson',
          progressPercent: 30,
        },
        myCourses: [
          {
            courseId: 2,
            title: 'Course 2',
            progressPercent: 60,
          },
        ],
        notifications: {
          unreadCount: 2,
        },
      };

      jest.spyOn(service, 'getHome').mockResolvedValue(mockHomeData);

      const result = await controller.getHome(mockUserId);

      expect(service.getHome).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockHomeData);
    });

    it('should handle missing data gracefully', async () => {
      const mockHomeData: LearnerHomeResponseDto = {
        header: {
          userId: mockUserId,
          displayName: null,
          avatarUrl: null,
          xp: 0,
          streakDays: 0,
        },
        continueLearning: null,
        myCourses: [],
        notifications: {
          unreadCount: 0,
        },
      };

      jest.spyOn(service, 'getHome').mockResolvedValue(mockHomeData);

      const result = await controller.getHome(mockUserId);

      expect(result).toEqual(mockHomeData);
    });
  });
});
