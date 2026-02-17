import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationRepo: jest.Mocked<Partial<Repository<Notification>>>;

  const mockUserId = 'test-user-id';

  beforeEach(async () => {
    notificationRepo = {
      create: (jest.fn((x: any) => x) as any),
      save: jest.fn(),
      count: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: notificationRepo,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should create notification successfully', async () => {
      const title = 'Test Notification';
      const message = 'Test message';
      const type = 'info' as const;
      const metadata = { courseId: 1 };

      const mockNotification = {
        notificationId: 1,
        userId: mockUserId,
        title,
        message,
        type,
        metadata,
        readAt: null,
        createdAt: new Date(),
      };

      (notificationRepo.save as jest.Mock).mockResolvedValue(mockNotification);

      const result = await service.createNotification(mockUserId, title, message, type, metadata);

      expect(notificationRepo.create).toHaveBeenCalledWith({
        userId: mockUserId,
        title,
        message,
        type,
        metadata,
      });
      expect(notificationRepo.save).toHaveBeenCalled();

      expect(result).toEqual(mockNotification);
    });
  });

  describe('getNotifications', () => {
    it('should return paginated notifications for user', async () => {
      const mockNotifications = [
        {
          notificationId: 1,
          userId: mockUserId,
          title: 'Notification 1',
          message: 'Message 1',
          type: 'info',
          readAt: null,
          metadata: {},
          createdAt: new Date(),
        },
        {
          notificationId: 2,
          userId: mockUserId,
          title: 'Notification 2',
          message: 'Message 2',
          type: 'success',
          readAt: new Date(),
          metadata: {},
          createdAt: new Date(),
        },
      ];

      (notificationRepo.find as jest.Mock).mockResolvedValue(mockNotifications);

      const result = await service.getNotifications(mockUserId, 10, 0);

      expect(notificationRepo.find).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        order: { createdAt: 'DESC' },
        take: 10,
        skip: 0,
      });

      expect(result).toEqual(mockNotifications);
    });

    it('should use default pagination when not provided', async () => {
      (notificationRepo.find as jest.Mock).mockResolvedValue([]);

      await service.getNotifications(mockUserId);

      expect(notificationRepo.find).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        order: { createdAt: 'DESC' },
        take: 20,
        skip: 0,
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      (notificationRepo.count as jest.Mock).mockResolvedValue(3);

      const result = await service.getUnreadCount(mockUserId);

      expect(notificationRepo.count).toHaveBeenCalledWith({
        where: { userId: mockUserId, readAt: IsNull() },
      });

      expect(result).toBe(3);
    });

    it('should return 0 when no unread notifications', async () => {
      (notificationRepo.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getUnreadCount(mockUserId);

      expect(result).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should update notification readAt', async () => {
      (notificationRepo.update as jest.Mock).mockResolvedValue({ affected: 1 });

      await expect(service.markAsRead(1, mockUserId)).resolves.toBeUndefined();

      expect(notificationRepo.update).toHaveBeenCalledWith(
        { notificationId: 1, userId: mockUserId },
        { readAt: expect.any(Date) },
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should update all unread notifications', async () => {
      (notificationRepo.update as jest.Mock).mockResolvedValue({ affected: 2 });

      await expect(service.markAllAsRead(mockUserId)).resolves.toBeUndefined();

      expect(notificationRepo.update).toHaveBeenCalledWith(
        { userId: mockUserId, readAt: IsNull() },
        { readAt: expect.any(Date) },
      );
    });
  });
});
