import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
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
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

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
          id: '550e8400-e29b-41d4-a716-446655440000',
          title: 'Course Completed! 🎉',
          message: 'Congratulations! You\'ve completed "Basic TypeScript"',
          type: 'success',
          readAt: null,
          metadata: { type: 'course_completed', courseTitle: 'Basic TypeScript' },
          createdAt: '2025-01-15T10:30:00.000Z'
        },
        {
          id: '660e8400-e29b-41d4-a716-446655440001',
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
      id: notification.notificationId,
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

  // Admin endpoints
  @Get('admin/all')
  @ApiOperation({ 
    summary: 'ดูการแจ้งเตือนทั้งหมด (Admin)',
    description: 'Get all notifications for admin management'
  })
  @ApiQuery({ name: 'page', type: 'number', required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: 'number', required: false, example: 20 })
  @ApiOkResponse({ 
    type: PaginatedNotificationsDto,
    description: 'All notifications for admin'
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getAllNotifications(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<PaginatedNotificationsDto> {
    const offset = (page - 1) * limit;
    
    const { notifications, total } = await this.notificationsService.getAllNotifications(limit, offset);

    const notificationDtos: NotificationResponseDto[] = notifications.map(notification => ({
      id: notification.notificationId,
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
      page,
      limit,
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

  @Post()
  @ApiOperation({ 
    summary: 'สร้างการแจ้งเตือนใหม่ (Admin/System)',
    description: 'Create a new notification for a user (Admin or System use only)'
  })
  @ApiOkResponse({ 
    description: 'Notification created successfully',
    type: NotificationResponseDto,
    example: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Course Completed! 🎉',
      message: 'Congratulations! You completed "TypeScript Basics"',
      type: 'success',
      readAt: null,
      metadata: { type: 'course_completed', courseTitle: 'TypeScript Basics', courseId: 1 },
      createdAt: '2026-02-18T12:30:00.000Z'
    }
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input data or missing userId' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createNotification(@Body() createDto: CreateNotificationDto): Promise<NotificationResponseDto> {
    if (createDto.userId) {
      // ส่งให้ user คนเดียว
      const notification = await this.notificationsService.adminCreateNotification(
        createDto.userId,
        createDto.title,
        createDto.message,
        createDto.type,
        createDto.metadata
      );

      return {
        id: notification.notificationId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        readAt: notification.readAt?.toISOString() ?? null,
        metadata: notification.metadata ?? {},
        createdAt: notification.createdAt.toISOString(),
      };
    } else {
      // ส่งให้ทุกคน - system notification
      // TODO: Implement broadcast notification to all users
      throw new BadRequestException('Broadcast notifications to all users is not yet implemented');
    }
  }

  @Post(':id/read')
  @ApiOperation({ 
    summary: 'ทำเครื่องหมายว่าอ่านแล้ว (รายการเดียว)',
    description: 'Mark a specific notification as read'
  })
  @ApiOkResponse({ 
    description: 'Notification marked as read successfully',
    example: { 
      message: 'Notification marked as read',
      notificationId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '123e4567-e89b-12d3-a456-426614174000'
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async markAsRead(
    @Param('id') notificationId: string,
    @CurrentUserId() userId: string
  ): Promise<{ message: string }> {
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    await this.notificationsService.markAsRead(notificationId, userId);
    return { message: 'Notification marked as read' };
  }

  @Post('read-all')
  @ApiOperation({ 
    summary: 'ทำเครื่องหมายว่าอ่านทั้งหมด',
    description: 'Mark all notifications as read for the current user'
  })
  @ApiOkResponse({ 
    description: 'All notifications marked as read successfully',
    example: { 
      message: 'All notifications marked as read',
      userId: '123e4567-e89b-12d3-a456-426614174000',
      markedCount: 15,
      timestamp: '2026-02-18T12:30:00.000Z'
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async markAllAsRead(@CurrentUserId() userId: string): Promise<{ message: string }> {
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    await this.notificationsService.markAllAsRead(userId);
    return { message: 'All notifications marked as read' };
  }

  @Put(':id')
  @ApiOperation({ 
    summary: 'แก้ไขการแจ้งเตือน (Admin/System)',
    description: 'Update an existing notification (Admin or System use only)'
  })
  @ApiOkResponse({ 
    description: 'Notification updated successfully',
    type: NotificationResponseDto,
    example: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Updated: Course Completed! 🎉',
      message: 'Congratulations! You successfully completed "Advanced TypeScript"',
      type: 'success',
      readAt: null,
      metadata: { type: 'course_completed', courseTitle: 'Advanced TypeScript', courseId: 2, updated: true },
      createdAt: '2026-02-18T12:30:00.000Z'
    }
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async updateNotification(
    @Param('id', ParseUUIDPipe) notificationId: string,
    @Body() updateDto: UpdateNotificationDto
  ): Promise<NotificationResponseDto> {
    const notification = await this.notificationsService.updateNotification(
      notificationId,
      updateDto
    );

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return {
      id: notification.notificationId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      readAt: notification.readAt?.toISOString() ?? null,
      metadata: notification.metadata ?? {},
      createdAt: notification.createdAt.toISOString(),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'ลบการแจ้งเตือน (Admin/System)',
    description: 'Delete a notification (Admin or System use only)'
  })
  @ApiResponse({ status: 204, description: 'Notification deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async deleteNotification(
    @Param('id', ParseUUIDPipe) notificationId: string
  ): Promise<void> {
    const deleted = await this.notificationsService.deleteNotification(notificationId);
    
    if (!deleted) {
      throw new NotFoundException('Notification not found');
    }
  }

  @Delete(':id/user')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'ผู้ใช้ลบการแจ้งเตือนตัวเอง',
    description: 'Delete a notification for the current user (User can only delete their own notifications)'
  })
  @ApiResponse({ status: 204, description: 'Notification deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot delete other user notifications', 
    example: {
      message: 'Notification not found or you do not have permission to delete it',
      error: 'Forbidden'
    }
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async deleteMyNotification(
    @Param('id', ParseUUIDPipe) notificationId: string,
    @CurrentUserId() userId: string
  ): Promise<void> {
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const deleted = await this.notificationsService.deleteUserNotification(notificationId, userId);
    
    if (!deleted) {
      throw new NotFoundException('Notification not found or you do not have permission to delete it');
    }
  }

  @Delete('user/all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'ผู้ใช้ลบการแจ้งเตือนทั้งหมดของตัวเอง',
    description: 'Delete all notifications for the current user. Useful for cleanup or privacy purposes.'
  })
  @ApiResponse({ 
    status: 204, 
    description: 'All notifications deleted successfully',
    example: {
      message: 'All notifications deleted successfully',
      deletedCount: 25,
      userId: '123e4567-e89b-12d3-a456-426614174000',
      timestamp: '2026-02-18T12:30:00.000Z'
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async deleteAllMyNotifications(@CurrentUserId() userId: string): Promise<void> {
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    await this.notificationsService.deleteAllUserNotifications(userId);
  }
}
