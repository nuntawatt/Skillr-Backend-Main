import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) { }

  async create(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = NotificationType.INFO,
    data?: Record<string, any>
  ):
    Promise<Notification> {
    const numericUserId = Number(userId);
    const notification = this.notificationRepository.create({
      userId: numericUserId,
      title,
      message,
      type,
      data,
    });

    return this.notificationRepository.save(notification);
  }

  async findByUser(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    const numericUserId = Number(userId);
    return this.notificationRepository.find({
      where: unreadOnly ? { userId: numericUserId, isRead: false } : { userId: numericUserId },
      order: { createdAt: 'DESC' },
    });
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const numericUserId = Number(userId);
    const count = await this.notificationRepository.count({
      where: { userId: numericUserId, isRead: false },
    });
    return { count };
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notificationId = Number(id);
    const numericUserId = Number(userId);
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    if (notification.userId !== numericUserId) {
      throw new ForbiddenException('You can only mark your own notifications as read');
    }

    notification.isRead = true;
    notification.readAt = new Date();

    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const numericUserId = Number(userId);
    const result = await this.notificationRepository.update(
      { userId: numericUserId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return { updated: result.affected || 0 };
  }

  async remove(id: string, userId: string): Promise<void> {
    const notificationId = Number(id);
    const numericUserId = Number(userId);
    const notification = await this.notificationRepository.findOne({ where: { id: notificationId } });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    if (notification.userId !== numericUserId) {
      throw new ForbiddenException('You can only delete your own notifications');
    }

    await this.notificationRepository.remove(notification);
  }

  // Helper methods for sending notifications
  async sendEnrollmentNotification(userId: string, courseName: string): Promise<Notification> {
    return this.create(
      userId,
      'Enrollment Successful',
      `You have successfully enrolled in ${courseName}`,
      NotificationType.SUCCESS,
      { type: 'enrollment' }
    );
  }

  async sendPaymentNotification(userId: string, amount: number, courseName: string): Promise<Notification> {
    return this.create(
      userId,
      'Payment Confirmed',
      `Your payment of ${amount} for ${courseName} has been confirmed`,
      NotificationType.SUCCESS,
      { type: 'payment' }
    );
  }

  async sendAssignmentDueNotification(userId: string, assignmentTitle: string, dueDate: Date): Promise<Notification> {
    return this.create(
      userId,
      'Assignment Due Soon',
      `Assignment "${assignmentTitle}" is due on ${dueDate.toLocaleDateString()}`,
      NotificationType.WARNING,
      { type: 'assignment_due' }
    );
  }
}
