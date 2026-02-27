import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { AnnouncementsService } from '../announcements/announcements.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly announcementsService: AnnouncementsService,
  ) {}

  private async syncActiveAnnouncementsToUser(userId: string): Promise<void> {
    console.log(`🔄 Syncing announcements for user: ${userId}`);
    const activeAnnouncements = await this.announcementsService.findActive(10);
    console.log(`📢 Found ${activeAnnouncements.length} active announcements:`, activeAnnouncements.map(a => ({ id: a.announcement_id, title: a.title, active: a.activeStatus })));
    
    const activeAnnouncementIds = new Set(activeAnnouncements.map((item) => item.announcement_id.toString()));
    console.log(`🎯 Active announcement IDs:`, Array.from(activeAnnouncementIds));

    // ค้นหา notifications ที่มาจาก announcements ทั้งหมดของ user
    const existingAnnouncementNotifications = await this.notificationRepository
      .createQueryBuilder('n')
      .where('n.user_id = :userId', { userId })
      .andWhere(`n.metadata ->> 'source' = :source`, { source: 'announcement' })
      .getMany();
    console.log(`📋 Found ${existingAnnouncementNotifications.length} existing announcement notifications`);

    // สร้าง map ของ announcementId -> notification
    const existingByAnnouncementId = new Map<string, Notification>();
    const duplicateNotifications: Notification[] = [];
    
    for (const item of existingAnnouncementNotifications) {
      const announcementId = item.metadata?.announcementId;
      console.log(`📝 Existing notification: ${item.notificationId} -> announcementId: ${announcementId}`);
      
      if (announcementId !== undefined && announcementId !== null) {
        const announcementIdStr = String(announcementId);
        
        // ถ้าเจอซ้ำ -> เก็บไว้ลบ
        if (existingByAnnouncementId.has(announcementIdStr)) {
          console.log(`🔄 DUPLICATE FOUND: announcementId ${announcementIdStr} has multiple notifications`);
          duplicateNotifications.push(item);
        } else {
          existingByAnnouncementId.set(announcementIdStr, item);
        }
      }
    }
    
    console.log(`🗺️  Unique existing map:`, Array.from(existingByAnnouncementId.keys()));
    console.log(`🗑️  Found ${duplicateNotifications.length} duplicate notifications to delete`);

    // ลบข้อมูลซ้ำก่อน
    if (duplicateNotifications.length > 0) {
      const duplicateIds = duplicateNotifications.map(n => n.notificationId);
      await this.notificationRepository.delete(duplicateIds);
      console.log(`💣 Deleted ${duplicateIds.length} duplicate notifications:`, duplicateIds);
    }

    const toInsert: Notification[] = [];
    for (const announcement of activeAnnouncements) {
      const announcementId = String(announcement.announcement_id);
      
      if (existingByAnnouncementId.has(announcementId)) {
        console.log(`⏭️  Skipping announcement ${announcementId} - already exists as ${existingByAnnouncementId.get(announcementId)?.notificationId}`);
        continue;
      }

      console.log(`➕ Creating notification for announcement ${announcementId}: ${announcement.title}`);
      toInsert.push(
        this.notificationRepository.create({
          userId,
          title: announcement.title,
          message: announcement.title,
          type: 'info',
          metadata: {
            source: 'announcement',
            announcementId,
            imageUrl: announcement.imageUrl ?? null,
            deepLink: announcement.deepLink ?? null,
            priority: announcement.priority,
          },
        }),
      );
    }

    if (toInsert.length > 0) {
      console.log(`💾 Inserting ${toInsert.length} new notifications`);
      const saved = await this.notificationRepository.save(toInsert);
      console.log(`✅ Saved notifications:`, saved.map(n => n.notificationId));
    } else {
      console.log(`📭 No new notifications to insert`);
    }

    // ลบ notifications ที่ไม่ active แล้ว
    const staleNotificationIds = existingAnnouncementNotifications
      .filter((item) => {
        const announcementId = String(item.metadata?.announcementId ?? '');
        const isDuplicate = duplicateNotifications.includes(item);
        const isStale = !activeAnnouncementIds.has(announcementId);
        return !isDuplicate && isStale;
      })
      .map((item) => item.notificationId);

    if (staleNotificationIds.length > 0) {
      console.log(`🗑️  Deleting ${staleNotificationIds.length} stale notifications:`, staleNotificationIds);
      await this.notificationRepository.delete(staleNotificationIds);
    }

    console.log(`✅ Sync completed for user: ${userId} - Final count: ${activeAnnouncementIds.size} active, ${toInsert.length} new, ${duplicateNotifications.length} duplicates removed, ${staleNotificationIds.length} stale removed`);
  }

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
    await this.syncActiveAnnouncementsToUser(userId);
    return this.notificationRepository.count({
      where: { userId, readAt: IsNull() },
    });
  }

  async getNotifications(userId: string, limit = 20, offset = 0) {
    await this.syncActiveAnnouncementsToUser(userId);
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async countNotifications(userId: string): Promise<number> {
    await this.syncActiveAnnouncementsToUser(userId);
    return this.notificationRepository.count({
      where: { userId },
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
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

  async updateNotification(notificationId: string, updateData: Partial<{
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    metadata: Record<string, any>;
  }>): Promise<Notification | null> {
    await this.notificationRepository.update(notificationId, updateData);
    
    return this.notificationRepository.findOne({
      where: { notificationId }
    });
  }

  async deleteNotification(notificationId: string): Promise<boolean> {
    const result = await this.notificationRepository.delete(notificationId);
    return (result.affected ?? 0) > 0;
  }

  async deleteUserNotification(notificationId: string, userId: string): Promise<boolean> {
    const result = await this.notificationRepository.delete({
      notificationId,
      userId
    });
    return (result.affected ?? 0) > 0;
  }

  async deleteAllUserNotifications(userId: string): Promise<void> {
    await this.notificationRepository.delete({ userId });
  }

  // Admin methods
  async getAllNotifications(limit = 20, offset = 0) {
    const [notifications, total] = await Promise.all([
      this.notificationRepository.find({
        order: { createdAt: 'DESC' },
        take: limit,
        skip: offset,
      }),
      this.notificationRepository.count(),
    ]);

    return { notifications, total };
  }

}
