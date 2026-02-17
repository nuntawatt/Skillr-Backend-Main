import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';

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

const { NotificationsController } = require('./notifications.controller');

describe('NotificationsController', () => {
  let controller: InstanceType<typeof NotificationsController>;
  let service: NotificationsService;

  const mockUserId = 'test-user-id';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: {
            getNotifications: jest.fn(),
            getUnreadCount: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InstanceType<typeof NotificationsController>>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getNotifications', () => {
    it('should return paginated notifications', async () => {
      const mockNotifications: Notification[] = [
        {
          notificationId: 1,
          userId: mockUserId,
          title: 'Test Notification',
          message: 'Test message',
          type: 'info',
          readAt: null,
          metadata: {},
          createdAt: new Date(),
        },
      ];

      jest.spyOn(service, 'getNotifications').mockResolvedValue(mockNotifications);

      const result = await controller.getNotifications(mockUserId, 10, 0);

      expect(service.getNotifications).toHaveBeenCalledWith(mockUserId, 10, 0);
      expect(result).toEqual(mockNotifications);
    });

    it('should use default pagination when not provided', async () => {
      const mockNotifications: Notification[] = [];

      jest.spyOn(service, 'getNotifications').mockResolvedValue(mockNotifications);

      const result = await controller.getNotifications(mockUserId);

      expect(service.getNotifications).toHaveBeenCalledWith(mockUserId, 20, 0);
      expect(result).toEqual(mockNotifications);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      jest.spyOn(service, 'getUnreadCount').mockResolvedValue(3);

      const result = await controller.getUnreadCount(mockUserId);

      expect(service.getUnreadCount).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual({ unreadCount: 3 });
    });

    it('should return 0 when no unread notifications', async () => {
      jest.spyOn(service, 'getUnreadCount').mockResolvedValue(0);

      const result = await controller.getUnreadCount(mockUserId);

      expect(result).toEqual({ unreadCount: 0 });
    });
  });
});
