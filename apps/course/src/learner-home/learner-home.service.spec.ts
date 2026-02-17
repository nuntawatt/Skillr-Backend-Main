import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Repository } from 'typeorm';
import { LearnerHomeService } from './learner-home.service';
import { StreakService } from '../streaks/streak.service';
import { ProgressService } from '../progress/progress.service';
import { WishlistService } from '../wishlist/wishlist.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LessonProgress } from '../progress/entities/progress.entity';
import { UserXp } from '../quizs/entities/user-xp.entity';
import { Lesson } from '../lessons/entities/lesson.entity';
import { Chapter } from '../chapters/entities/chapter.entity';
import { Course } from '../courses/entities/course.entity';
import { Level } from '../levels/entities/level.entity';
import { UserStreak } from '../streaks/entities/user-streak.entity';

describe('LearnerHomeService', () => {
  let service: LearnerHomeService;
  let streakService: StreakService;
  let progressService: ProgressService;
  let wishlistService: WishlistService;
  let notificationsService: NotificationsService;
  let lessonProgressRepo: jest.Mocked<Partial<Repository<LessonProgress>>>;
  let userXpRepo: jest.Mocked<Partial<Repository<UserXp>>>;

  const mockUserId = 'test-user-id';

  beforeEach(async () => {
    lessonProgressRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    userXpRepo = {
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearnerHomeService,
        {
          provide: ProgressService,
          useValue: {},
        },
        {
          provide: StreakService,
          useValue: {
            getStreak: jest.fn(),
          },
        },
        {
          provide: WishlistService,
          useValue: {
            getWishlistWithCourseDetails: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            getUnreadCount: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(LessonProgress),
          useValue: lessonProgressRepo,
        },
        {
          provide: getRepositoryToken(UserXp),
          useValue: userXpRepo,
        },
        {
          provide: getRepositoryToken(Lesson),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Chapter),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Course),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Level),
          useValue: {},
        },
        {
          provide: getRepositoryToken(UserStreak),
          useValue: {},
        },
        {
          provide: HttpService,
          useValue: { axiosRef: { get: jest.fn() } },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<LearnerHomeService>(LearnerHomeService);
    streakService = module.get<StreakService>(StreakService);
    progressService = module.get<ProgressService>(ProgressService);
    wishlistService = module.get<WishlistService>(WishlistService);
    notificationsService = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHome', () => {
    it('should return complete learner home data', async () => {
      jest.spyOn<any, any>(service as any, 'getUserProfile').mockResolvedValue({
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
      });
      
      (streakService.getStreak as jest.Mock).mockResolvedValue({
        streak: { currentStreak: 5, longestStreak: 10 },
        color: '#FF6B6B',
        isReward: false,
      });

      jest.spyOn<any, any>(service as any, 'getTotalXp').mockResolvedValue(150);
      jest.spyOn<any, any>(service as any, 'getContinueLearning').mockResolvedValue({
        courseId: 1,
        courseTitle: 'Test Course',
        lessonId: 1,
        lessonTitle: 'Test Lesson',
        progressPercent: 30,
      });
      jest.spyOn<any, any>(service as any, 'getMyCourses').mockResolvedValue([
        { courseId: 2, title: 'Course 2', progressPercent: 60 },
      ]);

      (wishlistService.getWishlistWithCourseDetails as jest.Mock).mockResolvedValue([
        { courseId: 3, title: 'Course 3', progressPercent: 0, addedAt: new Date().toISOString() },
      ]);

      (notificationsService.getUnreadCount as jest.Mock).mockResolvedValue(2);

      const result = await service.getHome(mockUserId);

      expect(result).toEqual({
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
          { courseId: 2, title: 'Course 2', progressPercent: 60 },
        ],
        wishlistOrRecommended: [
          { courseId: 3, title: 'Course 3', progressPercent: 0 },
        ],
        notifications: {
          unreadCount: 2,
        },
      });
    });

    it('should handle missing profile data gracefully', async () => {
      jest.spyOn<any, any>(service as any, 'getUserProfile').mockResolvedValue(null);
      
      (streakService.getStreak as jest.Mock).mockResolvedValue({
        streak: { currentStreak: 0, longestStreak: 0 },
        color: '#E0E0E0',
        isReward: false,
      });

      jest.spyOn<any, any>(service as any, 'getTotalXp').mockResolvedValue(0);
      jest.spyOn<any, any>(service as any, 'getContinueLearning').mockResolvedValue(null);
      jest.spyOn<any, any>(service as any, 'getMyCourses').mockResolvedValue([]);

      (wishlistService.getWishlistWithCourseDetails as jest.Mock).mockResolvedValue([]);
      (notificationsService.getUnreadCount as jest.Mock).mockResolvedValue(0);

      const result = await service.getHome(mockUserId);

      expect(result.header.displayName).toBeNull();
      expect(result.header.avatarUrl).toBeNull();
      expect(result.continueLearning).toBeNull();
    });
  });
});
