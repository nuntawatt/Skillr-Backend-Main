import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth';

import { CurrentUserId } from './decorators/current-user-id.decorator';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { PaginatedNotificationsDto } from './dto/paginated-notifications.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ 
    summary: 'รับการแจ้งเตือนจากผู้ใช้',
    description: 'Get paginated list of user notifications with proper DTO response'
  })
  @ApiQuery({ name: 'limit', type: 'number', required: false, example: 20 })
  @ApiQuery({ name: 'offset', type: 'number', required: false, example: 0 })
  @ApiOkResponse({ 
    type: PaginatedNotificationsDto,
    description: 'Paginated list of user notifications',
    example: {
      data: [
        {
          notificationId: '550e8400-e29b-41d4-a716-446655440000',
          title: 'Course Completed! 🎉',
          message: 'Congratulations! You\'ve completed "Basic TypeScript"',
          type: 'success',
          readAt: null,
          metadata: { type: 'course_completed', courseTitle: 'Basic TypeScript' },
          createdAt: '2025-01-15T10:30:00.000Z'
        },
        {
          notificationId: '660e8400-e29b-41d4-a716-446655440001',
          title: 'Streak Milestone! 🔥',
          message: 'Amazing! You\'ve maintained a 7-day learning streak!',
          type: 'success',
          readAt: '2025-01-14T15:45:00.000Z',
          metadata: { type: 'streak_milestone', streakDays: 7 },
          createdAt: '2025-01-14T10:00:00.000Z'
        }
      ],
      total: 25,
      page: 1,
      limit: 20
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getNotifications(
    @CurrentUserId() userId: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<PaginatedNotificationsDto> {
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const rawLimit = typeof limit === 'number' && Number.isFinite(limit) ? limit : 20;
    const rawOffset = typeof offset === 'number' && Number.isFinite(offset) ? offset : 0;

    if (rawLimit < 1) {
      throw new BadRequestException('limit must be a positive integer');
    }

    if (rawOffset < 0) {
      throw new BadRequestException('offset must be a non-negative integer');
    }

    const safeLimit = Math.min(rawLimit, 50);
    
    const [notifications, total] = await Promise.all([
      this.notificationsService.getNotifications(userId, safeLimit, rawOffset),
      this.notificationsService.countNotifications(userId),
    ]);

    const notificationDtos: NotificationResponseDto[] = notifications.map(notification => ({
      notificationId: notification.notificationId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      readAt: notification.readAt?.toISOString() ?? null,
      metadata: notification.metadata ?? {},
      createdAt: notification.createdAt.toISOString(),
    }));

    return {
      data: notificationDtos,
      total,
      page: Math.floor(rawOffset / safeLimit) + 1,
      limit: safeLimit,
    };
  }

  @Get('unread-count')
  @ApiOperation({ 
    summary: 'รับจำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน',
    description: 'Get the number of unread notifications for the user'
  })
  @ApiOkResponse({ 
    description: 'Unread notifications count',
    example: 3
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getUnreadCount(@CurrentUserId() userId: string): Promise<{ unreadCount: number }> {
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    const unreadCount = await this.notificationsService.getUnreadCount(userId);
    return { unreadCount };
  }
}
