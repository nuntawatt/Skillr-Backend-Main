import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth';

import { CurrentUserId } from '../progress/decorators/current-user-id.decorator';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ 
    summary: 'รับการแจ้งเตือนจากผู้ใช้',
    description: 'Get paginated list of user notifications'
  })
  @ApiQuery({ name: 'limit', type: 'number', required: false, example: 20 })
  @ApiQuery({ name: 'offset', type: 'number', required: false, example: 0 })
  @ApiOkResponse({ 
    type: [Notification],
    description: 'List of user notifications',
    example: [
      {
        notificationId: 1,
        userId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Course Completed! 🎉',
        message: 'Congratulations! You\'ve completed "Basic TypeScript"',
        type: 'success',
        readAt: null,
        metadata: { type: 'course_completed', courseTitle: 'Basic TypeScript' },
        createdAt: '2025-01-15T10:30:00.000Z'
      },
      {
        notificationId: 2,
        userId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Streak Milestone! 🔥',
        message: 'Amazing! You\'ve maintained a 7-day learning streak!',
        type: 'success',
        readAt: '2025-01-14T15:45:00.000Z',
        metadata: { type: 'streak_milestone', streakDays: 7 },
        createdAt: '2025-01-14T10:00:00.000Z'
      }
    ]
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getNotifications(
    @CurrentUserId() userId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<Notification[]> {
    return this.notificationsService.getNotifications(userId, limit, offset);
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
    const unreadCount = await this.notificationsService.getUnreadCount(userId);
    return { unreadCount };
  }
}
