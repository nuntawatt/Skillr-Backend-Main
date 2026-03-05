import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { LearnerHomeService } from './learner-home.service';
import { StreakService } from '../streaks/streak.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LessonProgress } from '../progress/entities/progress.entity';
import { UserXp } from '../quizs/entities/user-xp.entity';
import { Course } from '../courses/entities/course.entity';

describe('LearnerHomeService', () => {
  let service: LearnerHomeService;
  let httpService: any;
  let configService: any;

  type StreakServiceMock = {
    getStreak: jest.Mock;
  };

  type NotificationsServiceMock = {
    getUnreadCount: jest.Mock;
  };

  type LessonProgressRepoMock = {
    createQueryBuilder: jest.Mock;
  };

  type UserXpRepoMock = {
    createQueryBuilder: jest.Mock;
  };

  type CourseRepoMock = {
    find: jest.Mock;
  };

  let streakService: StreakServiceMock;
  let notificationsService: NotificationsServiceMock;
  let lessonProgressRepo: LessonProgressRepoMock;
  let userXpRepo: UserXpRepoMock;
  let courseRepo: CourseRepoMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearnerHomeService,
        {
          provide: HttpService,
          useValue: {
            axiosRef: {
              get: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://auth/api'),
          },
        },
        {
          provide: StreakService,
          useValue: {
            getStreak: jest.fn(),
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
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserXp),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Course),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(LearnerHomeService);
    httpService = module.get(HttpService);
    configService = module.get(ConfigService);
    streakService = module.get(StreakService);
    notificationsService = module.get(NotificationsService);
    lessonProgressRepo = module.get(getRepositoryToken(LessonProgress));
    userXpRepo = module.get(getRepositoryToken(UserXp));
    courseRepo = module.get(getRepositoryToken(Course));

    jest.clearAllMocks();
  });

  it('throws UnauthorizedException when userId missing', async () => {
    await expect(service.getHome('', 'Bearer x')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns aggregated home data and skips profile when internalCall=true', async () => {
    (streakService.getStreak as jest.Mock).mockResolvedValue({ streak: { currentStreak: 5 } });
    (notificationsService.getUnreadCount as jest.Mock).mockResolvedValue(2);

    const userXpQb: any = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ total: '123' }),
    };
    userXpRepo.createQueryBuilder!.mockReturnValue(userXpQb);

    const continueLearningQb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        progressPercent: 40,
        lesson: {
          chapter: {
            chapter_title: 'Ch1',
            level: {
              level_title: 'L1',
              course: {
                course_id: 10,
                course_title: 'C1',
              },
            },
          },
        },
      }),
    };

    const myCoursesQb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          status: 'COMPLETED',
          lesson: {
            chapter: {
              level: {
                course: { course_id: 10, course_title: 'C1' },
              },
            },
          },
        },
        {
          status: 'STARTED',
          lesson: {
            chapter: {
              level: {
                course: { course_id: 10, course_title: 'C1' },
              },
            },
          },
        },
      ]),
    };

    (lessonProgressRepo.createQueryBuilder as jest.Mock)
      .mockReturnValueOnce(continueLearningQb)
      .mockReturnValueOnce(myCoursesQb);

    courseRepo.find!.mockResolvedValue([
      { course_id: 1, course_title: 'R1', course_imageUrl: null } as any,
      { course_id: 2, course_title: 'R2', course_imageUrl: 'img2' } as any,
    ]);

    const res = await service.getHome('u1', 'Bearer x', 'true');

    expect(res.header.userId).toBe('u1');
    expect(res.header.avatarUrl).toBeNull();
    expect(res.header.xp).toBe(123);
    expect(res.header.streakDays).toBe(5);

    expect(res.continueLearning?.course_id).toBe(10);
    expect(res.myCourses).toEqual([{ course_id: 10, title: 'C1', progressPercent: 50 }]);
    expect(res.notifications.unreadCount).toBe(2);
    expect(res.recommendations.courses).toHaveLength(2);

    expect(httpService.axiosRef.get).not.toHaveBeenCalled();
  });

  it('fetches profile when authorization provided and not internalCall', async () => {
    (streakService.getStreak as jest.Mock).mockResolvedValue({ streak: { currentStreak: 1 } });
    (notificationsService.getUnreadCount as jest.Mock).mockResolvedValue(0);

    const userXpQb: any = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
    };
    userXpRepo.createQueryBuilder!.mockReturnValue(userXpQb);

    const continueLearningQb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    const myCoursesQb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    (lessonProgressRepo.createQueryBuilder as jest.Mock)
      .mockReturnValueOnce(continueLearningQb)
      .mockReturnValueOnce(myCoursesQb);

    courseRepo.find!.mockResolvedValue([]);

    httpService.axiosRef.get.mockResolvedValue({ data: { avatarUrl: 'ava' } });

    const res = await service.getHome('u1', 'Bearer x');

    expect(configService.get).toHaveBeenCalled();
    expect(httpService.axiosRef.get).toHaveBeenCalledWith('http://auth/api/users/profile', {
      headers: { Authorization: 'Bearer x', 'X-Internal-Call': 'true' },
    });
    expect(res.header.avatarUrl).toBe('ava');
  });

  it('falls back to defaults when subcalls throw', async () => {
    (streakService.getStreak as jest.Mock).mockRejectedValue(new Error('boom'));
    (notificationsService.getUnreadCount as jest.Mock).mockRejectedValue(new Error('boom'));

    userXpRepo.createQueryBuilder!.mockImplementation(() => {
      throw new Error('boom');
    });

    (lessonProgressRepo.createQueryBuilder as jest.Mock).mockImplementation(() => {
      throw new Error('boom');
    });

    courseRepo.find!.mockRejectedValue(new Error('boom'));

    const res = await service.getHome('u1', 'Bearer x', 'true');

    expect(res.header.streakDays).toBe(0);
    expect(res.header.xp).toBe(0);
    expect(res.continueLearning).toBeNull();
    expect(res.myCourses).toEqual([]);
    expect(res.notifications.unreadCount).toBe(0);
    expect(res.recommendations.courses).toEqual([]);
  });
});
