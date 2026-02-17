import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    metadata?: Record<string, any>,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId,
      title,
      message,
      type,
      metadata,
    });
    return this.notificationRepository.save(notification);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, readAt: IsNull() },
    });
  }

  async getNotifications(userId: string, limit = 20, offset = 0) {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async markAsRead(notificationId: number, userId: string): Promise<void> {
    await this.notificationRepository.update(
      { notificationId, userId },
      { readAt: new Date() },
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, readAt: IsNull() },
      { readAt: new Date() },
    );
  }

  // Helper method to create common notification types
  async createCourseCompletedNotification(userId: string, courseTitle: string) {
    return this.createNotification(
      userId,
      'Course Completed! 🎉',
      `Congratulations! You've completed "${courseTitle}"`,
      'success',
      { type: 'course_completed', courseTitle },
    );
  }

  async createStreakAchievementNotification(userId: string, streakDays: number) {
    return this.createNotification(
      userId,
      'Streak Milestone! 🔥',
      `Amazing! You've maintained a ${streakDays}-day learning streak!`,
      'success',
      { type: 'streak_milestone', streakDays },
    );
  }
}
