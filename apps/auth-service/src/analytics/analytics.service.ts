import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserRole } from '@common/enums';
import type { AuthUser } from '@auth';

// Entities from different databases
import { User } from '../users/entities/user.entity';
import { LessonProgress } from '../../../../apps/course-service/src/progress/entities/progress.entity';
import { WebsocketGateway } from '../gateway/websocket.gateway';
import { Course } from '../../../../apps/course-service/src/courses/entities/course.entity';
import { UserStreak } from '../../../../apps/course-service/src/streaks/entities/user-streak.entity';

// DTOs
import {
  AdminDashboardAnalyticsDto,
  DashboardUserDto,
  LearningOverviewDto,
  OwnerOverviewDto,
  StreaksOverviewDto,
  UserActivitySummaryDto,
  UsersByMonthPointDto,
  AdminStatusSummaryDto,
} from './dto/admin-dashboard-analytics.dto';

/**
 * Analytics Service
 * 
 * ประมวลผลข้อมูล analytics สำหรับ Admin Dashboard
 * ใช้งานกับหลาย Database connections:
 * - Auth DB: users, admin accounts
 * - Course DB: lesson progress, course data
 * - Reward DB: reward redemptions (unused)
 * 
 * แบ่งข้อมูลตามสิทธิ์ผู้ใช้ (ADMIN vs OWNER)
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    // Auth DB Repository - สำหรับข้อมูลผู้ใช้และ admin accounts
    @InjectRepository(User, 'auth')
    private readonly userRepo: Repository<User>,

    // Course DB Repository - สำหรับข้อมูลความคืบหน้าการเรียน
    @InjectRepository(LessonProgress, 'course')
    private readonly lessonProgressRepo: Repository<LessonProgress>,

    // Course DB Repository - สำหรับข้อมูลคอร์สเรียน
    @InjectRepository(Course, 'course')
    private readonly courseRepo: Repository<Course>,

    // Course DB Repository - สำหรับข้อมูล streak
    @InjectRepository(UserStreak, 'course')
    private readonly userStreakRepo: Repository<UserStreak>,

    private readonly websocketGateway: WebsocketGateway,
  ) {}

  /**
   * ดึงข้อมูล Analytics หลักตามสิทธิ์ผู้ใช้
   * 
   * @param authUser ข้อมูลผู้ใช้จาก JWT (userId, email, role)
   * @param timeRange ช่วงเวลาสำหรับข้อมูลผู้ใช้รายเดือน
   * @returns AdminDashboardAnalyticsDto ข้อมูล analytics ตามสิทธิ์
   */
  async getDashboardAnalytics(
    authUser: AuthUser,
    timeRange?: string,
  ): Promise<AdminDashboardAnalyticsDto> {
    // ดึงข้อมูลการเรียนรู้ (ทุก role ต้องได้)
    const learningOverview = await this.getLearningOverview();

    // ถ้าไม่ใช่ OWNER → คืนแค่ข้อมูลการเรียนรู้
    if (authUser.role !== UserRole.OWNER) {
      return { learningOverview };
    }

    // OWNER → ดึงข้อมูลเพิ่มเติม
    const ownerOverview = await this.getOwnerOverview(timeRange);

    return {
      learningOverview,
      ownerOverview,
    };
  }

  /**
   * ดึงข้อมูลภาพรวมการเรียนรู้ (ทุก role เห็น)
   * 
   * Logic:
   * 1. Active Learners = นับ users ที่มี progress ไม่ใช่ LOCKED
   * 2. Course Progress = นับ user-course ที่ completed vs in-progress
   * 
   * @returns LearningOverviewDto ข้อมูลการเรียนรู้
   */
  private async getLearningOverview(): Promise<LearningOverviewDto> {
    const activeLearners = await this.getActiveLearnerCount();
    const dailyActiveLearners = await this.getDailyActiveLearnerCount();
    const courseProgress = await this.getCourseProgressSummary();

    return {
      activeLearners,
      dailyActiveLearners,
      completedCourses: courseProgress.completed,
      inProgressCourses: courseProgress.inProgress,
    };
  }

  /**
   * ดึงข้อมูลภาพรวมสำหรับ OWNER (เฉพาะ OWNER เห็น)
   * 
   * @param timeRange ช่วงเวลาสำหรับข้อมูลผู้ใช้รายเดือน
   * @returns OwnerOverviewDto ข้อมูลภาพรวมสำหรับ OWNER
   */
  private async getOwnerOverview(timeRange?: string): Promise<OwnerOverviewDto> {
    // ดึงข้อมูลพร้อมกันเพื่อ performance (parallel queries)
    const [
      totalUsers,
      usersByMonth,
      adminStatusSummary,
      totalCourses,
      streaks,
    ] = await Promise.all([
      this.userRepo.count(),                    // นับ users ทั้งหมด
      this.getUsersByTimeRange(timeRange),      // ข้อมูลผู้ใช้รายเดือน
      this.getAdminStatusSummary(),             // สรุป admin accounts
      this.courseRepo.count(),                  // นับจำนวนคอร์สทั้งหมด
      this.getStreaksOverview(),                // สรุป streaks
    ]);

    // User Activity Active = มีการเข้ามาใช้งาน, Inactive = ไม่ได้ใช้งาน
    const activeUsers = await this.getActiveLearnerCount(); // คนที่มี lesson progress
    
    const userActivity: UserActivitySummaryDto = {
      active: activeUsers,                    // เคยเข้ามาใช้งานในระบบ
      inactive: Math.max(totalUsers - activeUsers, 0),  // ไม่เคยเข้ามาใช้งาน
    };

    return {
      totalUsers,
      usersByMonth,
      admins: adminStatusSummary,
      totalCourses,
      userActivity,
      streaks,
    };
  }

  /**
   * ดึงรายชื่อผู้ใช้ทั้งหมดสำหรับ OWNER dashboard (optional)
   * จำกัดเฉพาะ field ที่จำเป็นต่อการแสดงผล
   * 
   * @param limit จำนวนผู้ใช้สูงสุดที่ต้องการ (default: 100)
   * @returns DashboardUserDto[] รายชื่อผู้ใช้
   */
  async getDashboardUsers(): Promise<DashboardUserDto[]> {
    const users = await this.userRepo.find({
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    const onlineUserIds = this.websocketGateway.getOnlineUserIds();

    return users.map((user) => ({
      ...user,
      status: onlineUserIds.has(user.id) ? 'online' : 'offline',
    }));
  }

  /**
   * นับจำนวน Active Learners
   * 
   * Logic: นับ users ที่มี lesson progress ไม่ใช่ LOCKED
   * - คนที่เคยคลิกเริ่มเรียน = Active Learner
   * - ไม่นับคนที่สมัครแต่ยังไม่เคยเรียน
   * 
   * @returns number จำนวน active learners
   */
  private async getActiveLearnerCount(): Promise<number> {
    const result = await this.lessonProgressRepo
      .createQueryBuilder('lp')
      .select('COUNT(DISTINCT lp.userId)', 'count')
      .where('lp.status != :status', { status: 'LOCKED' })
      .getRawOne<{ count: string }>();

    return Number(result?.count ?? 0);
  }

  /**
   * จำนวนผู้เข้าเรียนรายวัน (distinct users ที่มี progress วันนี้)
   */
  private async getDailyActiveLearnerCount(): Promise<number> {
    const { start, end } = this.getBangkokDayRange();

    const result = await this.lessonProgressRepo
      .createQueryBuilder('lp')
      .select('COUNT(DISTINCT lp.userId)', 'count')
      .where('lp.updatedAt >= :startDate', { startDate: start.toISOString() })
      .andWhere('lp.updatedAt < :endDate', { endDate: end.toISOString() })
      .getRawOne<{ count: string }>();

    return Number(result?.count ?? 0);
  }

  /**
   * สรุปความคืบหน้าคอร์ส (completed vs in-progress)
   * 
   * Logic:
   * 1. Join progress → lesson → chapter → level → course
   * 2. Group ตาม userId และ courseId
   * 3. นับ total lessons และ completed lessons
   * 4. completed = total → course เสร็จ
   * 5. มี progress แต่ยังไม่ completed → กำลังเรียน
   * 
   * @returns {completed: number, inProgress: number}
   */
  private async getCourseProgressSummary(): Promise<{
    completed: number;
    inProgress: number;
  }> {
    const rows = await this.lessonProgressRepo
      .createQueryBuilder('lp')
      .leftJoin('lp.lesson', 'l')
      .leftJoin('l.chapter', 'ch')
      .leftJoin('ch.level', 'lvl')
      .leftJoin('lvl.course', 'c')
      .select([
        'c.course_id',
        'lp.user_id',
        'COUNT(l.lesson_id) as total_lessons',
        'COUNT(CASE WHEN lp.status IN (\'COMPLETED\', \'SKIPPED\') THEN 1 END) as completed',
      ])
      .groupBy('c.course_id, lp.user_id')
      .getRawMany<{
        course_id: string;
        user_id: string;
        total_lessons: string;
        completed: string;
      }>();

    let completed = 0;
    let inProgress = 0;

    for (const row of rows) {
      const total = Number(row.total_lessons);
      const completedLessons = Number(row.completed);

      if (total > 0) {
        if (completedLessons >= total) {
          completed++;
        } else {
          inProgress++;
        }
      }
    }

    return { completed, inProgress };
  }

  /**
   * สรุป streaks เพื่อใช้ในกราฟ (bucket)
   */
  private async getStreaksOverview(): Promise<StreaksOverviewDto> {
    const row = await this.userStreakRepo
      .createQueryBuilder('us')
      .select(
        "SUM(CASE WHEN us.currentStreak >= 1 AND us.currentStreak < 10 THEN 1 ELSE 0 END)",
        'bucket1',
      )
      .addSelect(
        "SUM(CASE WHEN us.currentStreak >= 10 AND us.currentStreak < 30 THEN 1 ELSE 0 END)",
        'bucket10',
      )
      .addSelect(
        "SUM(CASE WHEN us.currentStreak >= 30 AND us.currentStreak < 100 THEN 1 ELSE 0 END)",
        'bucket30',
      )
      .addSelect(
        "SUM(CASE WHEN us.currentStreak >= 100 AND us.currentStreak < 300 THEN 1 ELSE 0 END)",
        'bucket100',
      )
      .addSelect(
        "SUM(CASE WHEN us.currentStreak >= 300 THEN 1 ELSE 0 END)",
        'bucket300',
      )
      .getRawOne<{ bucket1: string; bucket10: string; bucket30: string; bucket100: string; bucket300: string }>();

    const buckets = [
      { label: '1 วัน', count: Number(row?.bucket1 ?? 0) },
      { label: '10 วัน', count: Number(row?.bucket10 ?? 0) },
      { label: '30 วัน', count: Number(row?.bucket30 ?? 0) },
      { label: '100 วัน', count: Number(row?.bucket100 ?? 0) },
      { label: '300 วัน', count: Number(row?.bucket300 ?? 0) },
    ];

    return { buckets };
  }

  private getBangkokDayRange(): { start: Date; end: Date } {
    const offsetMs = 7 * 60 * 60 * 1000;
    const now = new Date();
    const bangkokTime = new Date(now.getTime() + offsetMs);
    const start = new Date(Date.UTC(
      bangkokTime.getUTCFullYear(),
      bangkokTime.getUTCMonth(),
      bangkokTime.getUTCDate(),
    ));
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }

  /**
   * ดึงข้อมูลผู้ใช้รายเดือนตาม timeRange
   * 
   * @param timeRange ช่วงเวลา (last12Months, yearYYYY, allTime)
   * @returns UsersByMonthPointDto[] ข้อมูลผู้ใช้รายเดือน
   */
  private async getUsersByTimeRange(timeRange?: string): Promise<UsersByMonthPointDto[]> {
    const range = timeRange || 'last12Months';

    if (range === 'allTime') {
      return this.getUsersByMonthAllTime();
    }

    if (range.startsWith('year')) {
      const year = parseInt(range.replace('year', ''), 10);
      if (year && !isNaN(year)) {
        return this.getUsersByMonth(year);
      }
    }

    // Default: last12Months
    return this.getUsersByMonthLast12Months();
  }

  /**
   * ดึงข้อมูลผู้ใช้รายเดือนสำหรับปีที่ระบุ
   * 
   * Logic:
   * 1. Query users ที่สมัครในปีนั้น
   * 2. Group ตามเดือน (date_trunc month)
   * 3. เติมเดือนที่ไม่มีข้อมูลให้เป็น 0 (เพื่อให้กราฟสวย)
   * 
   * @param year ปีที่ต้องการ (เช่น 2026)
   * @returns UsersByMonthPointDto[] ข้อมูล 12 เดือนของปีนั้น
   */
  private async getUsersByMonth(year: number): Promise<UsersByMonthPointDto[]> {
    const startDate = `${year}-01-01T00:00:00.000Z`;
    const endDate = `${year + 1}-01-01T00:00:00.000Z`;

    const rawRows = await this.userRepo
      .createQueryBuilder('u')
      .select("TO_CHAR(date_trunc('month', u.createdAt), 'YYYY-MM')", 'month')
      .addSelect('COUNT(*)', 'count')
      .where('u.createdAt >= :startDate', { startDate })
      .andWhere('u.createdAt < :endDate', { endDate })
      .groupBy("date_trunc('month', u.createdAt)")
      .orderBy("date_trunc('month', u.createdAt)", 'ASC')
      .getRawMany<{ month: string; count: string }>();

    const countByMonth = new Map(rawRows.map((r) => [r.month, Number(r.count)]));

    // เติมเดือนที่ไม่มีข้อมูลให้เป็น 0 (กราฟจะไม่ขาดตอน)
    const points: UsersByMonthPointDto[] = [];
    for (let month = 1; month <= 12; month += 1) {
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      points.push({
        month: monthKey,
        count: countByMonth.get(monthKey) ?? 0,
      });
    }

    return points;
  }

  /**
   * ดึงข้อมูลผู้ใช้รายเดือนตั้งแต่เริ่มระบบ
   * 
   * Logic: แสดงเฉพาะเดือนที่มีข้อมูลจริง (ไม่เติม 0)
   * 
   * @returns UsersByMonthPointDto[] ข้อมูลผู้ใช้รายเดือนทั้งหมด
   */
  private async getUsersByMonthAllTime(): Promise<UsersByMonthPointDto[]> {
    const rawRows = await this.userRepo
      .createQueryBuilder('u')
      .select("TO_CHAR(date_trunc('month', u.createdAt), 'YYYY-MM')", 'month')
      .addSelect('COUNT(*)', 'count')
      .groupBy("date_trunc('month', u.createdAt)")
      .orderBy("date_trunc('month', u.createdAt)", 'ASC')
      .getRawMany<{ month: string; count: string }>();

    return rawRows.map((row) => ({
      month: row.month,
      count: Number(row.count),
    }));
  }

  /**
   * ดึงข้อมูลผู้ใช้รายเดือน 12 เดือนล่าสุด
   * 
   * Logic:
   * 1. หาช่วง 12 เดือนหลังจากเดือนปัจจุบัน
   * 2. Query users ในช่วงนั้น
   * 3. เติมเดือนว่างให้เป็น 0
   * 
   * @returns UsersByMonthPointDto[] ข้อมูล 12 เดือนล่าสุด
   */
  private async getUsersByMonthLast12Months(): Promise<UsersByMonthPointDto[]> {
    const now = new Date();
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));

    const rawRows = await this.userRepo
      .createQueryBuilder('u')
      .select("TO_CHAR(date_trunc('month', u.createdAt), 'YYYY-MM')", 'month')
      .addSelect('COUNT(*)', 'count')
      .where('u.createdAt >= :startDate', { startDate: start.toISOString() })
      .andWhere('u.createdAt < :endDate', { endDate: end.toISOString() })
      .groupBy("date_trunc('month', u.createdAt)")
      .orderBy("date_trunc('month', u.createdAt)", 'ASC')
      .getRawMany<{ month: string; count: string }>();

    const countByMonth = new Map(rawRows.map((r) => [r.month, Number(r.count)]));

    // สร้างข้อมูล 12 เดือน (เติมเดือนว่างให้เป็น 0)
    const points: UsersByMonthPointDto[] = [];
    for (let i = 0; i < 12; i += 1) {
      const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
      const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      points.push({
        month: monthKey,
        count: countByMonth.get(monthKey) ?? 0,
      });
    }

    return points;
  }

  /**
   * สรุปสถานะ Admin Accounts
   * 
   * Logic: นับ ADMIN เท่านั้น (ไม่รวม OWNER)
   * 
   * @returns AdminStatusSummaryDto สรุป admin accounts
   */
  private async getAdminStatusSummary(): Promise<AdminStatusSummaryDto> {
    const rows = await this.userRepo
      .createQueryBuilder('u')
      .select('u.status')
      .addSelect('COUNT(*)', 'count')
      .where('u.role = :role', { role: UserRole.ADMIN })
      .groupBy('u.status')
      .getRawMany<{ status: string; count: string }>();

    const statusMap = new Map(rows.map((r) => [r.status, Number(r.count)]));

    const total = Array.from(statusMap.values()).reduce((sum, count) => sum + count, 0);
    const active = statusMap.get('active') ?? 0;
    const invited = statusMap.get('invited') ?? 0;

    return { total, active, invited };
  }

}
