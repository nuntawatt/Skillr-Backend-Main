import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * ข้อมูลผู้ใช้รายเดือน - ใช้สำหรับกราฟการเติบโตของผู้ใช้
 * จะคืนข้อมูล 12 เดือนเสมอ (เดือนที่ไม่มีข้อมูลจะเป็น 0)
 */
export class UsersByMonthPointDto {
  @ApiProperty({ example: '2026-01', description: 'Year-month label (YYYY-MM)' })
  month: string;

  @ApiProperty({ example: 120, description: 'Number of registered users created in that month' })
  count: number;
}

/**
 * ข้อมูลภาพรวมการเรียนรู้ - ทั้ง ADMIN และ OWNER เห็นข้อมูลนี้
 * ใช้สำหรับติดตามความคืบหน้าการเรียนของนักเรียน
 */
export class LearningOverviewDto {
  @ApiProperty({ description: 'Active learners (unique users who have started learning and are not only in LOCKED state)' })
  activeLearners: number;

  @ApiProperty({ description: 'Number of user-course pairs where all lessons in the course are completed/skipped' })
  completedCourses: number;

  @ApiProperty({ description: 'Number of user-course pairs where the course has been started but not fully completed' })
  inProgressCourses: number;
}

/**
 * สรุปสถานะ Admin Accounts - เฉพาะ OWNER เห็นข้อมูลนี้
 * นับเฉพาะ ADMIN role เท่านั้น (ไม่รวม OWNER)
 */
export class AdminStatusSummaryDto {
  @ApiProperty({ description: 'Total number of admin accounts (role = ADMIN only)' })
  total: number;

  @ApiProperty({ description: "Number of admin accounts with status 'active'" })
  active: number;

  @ApiProperty({ description: "Number of admin accounts with status 'invited'" })
  invited: number;
}

/**
 * สรุปข้อมูลรางวัล - เฉพาะ OWNER เห็นข้อมูลนี้ (ถ้า REWARD_ENABLED=true)
 * ใช้สำหรับติดตามการใช้งานระบบรางวัล
 */
export class RewardOverviewDto {
  @ApiProperty({ description: 'Total reward redemption transactions count' })
  redemptionCount: number;

  @ApiProperty({ description: 'Total XP/points used across all redemptions' })
  usedXp: number;
}

/**
 * ข้อมูลผู้ใช้สำหรับแสดงใน Owner Dashboard
 * ใช้สำหรับ endpoint analytics/users
 */
export class DashboardUserDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;

  @ApiPropertyOptional({ nullable: true })
  username: string | null;

  @ApiPropertyOptional({ nullable: true })
  avatar: string | null;

  @ApiPropertyOptional({ nullable: true })
  firstName: string | null;

  @ApiPropertyOptional({ nullable: true })
  lastName: string | null;

  @ApiProperty()
  role: string;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty({ description: "Current presence status derived from socket connection ('online' | 'offline')" })
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

/**
 * ข้อมูลภาพรวมสำหรับ OWNER - เฉพาะ OWNER เห็นข้อมูลนี้เท่านั้น
 * รวมข้อมูลธุรกิจ การเติบโต และการจัดการทีมงาน
 */
export class OwnerOverviewDto {
  @ApiProperty({ description: 'Total user accounts in the system (all roles)' })
  totalUsers: number;

  @ApiProperty({
    type: () => [UsersByMonthPointDto],
    description: 'Monthly registered users for the requested timeRange. Always returns complete data (missing months have count=0).',
  })
  usersByMonth: UsersByMonthPointDto[];

  @ApiProperty({ type: () => AdminStatusSummaryDto, description: 'Admin accounts summary (ADMIN + OWNER)' })
  admins: AdminStatusSummaryDto;

  @ApiPropertyOptional({
    type: () => RewardOverviewDto,
    nullable: true,
    description: 'Reward redemptions summary (null when REWARD_ENABLED is not true)',
  })
  rewards: RewardOverviewDto | null;
}

/**
 * Response สำหรับดึงรายชื่อผู้ใช้ใน Admin Dashboard (OWNER เท่านั้น)
 */
export class DashboardUsersResponseDto {
  @ApiProperty({ type: () => [DashboardUserDto] })
  users: DashboardUserDto[];
}

/**
 * Response หลักของ Admin Dashboard Analytics - แบ่งข้อมูลตามสิทธิ์ผู้ใช้
 * ADMIN: เห็นแค่ learningOverview
 * OWNER: เห็นทั้ง learningOverview และ ownerOverview
 */
export class AdminDashboardAnalyticsDto {
  @ApiProperty({ type: () => LearningOverviewDto, description: 'Learning analytics visible to ADMIN and OWNER' })
  learningOverview: LearningOverviewDto;

  @ApiPropertyOptional({ type: () => OwnerOverviewDto, description: 'Owner-only analytics (visible only to OWNER)' })
  ownerOverview?: OwnerOverviewDto;

  @ApiProperty({
    example: {
      learningOverview: {
        activeLearners: 12,
        completedCourses: 3,
        inProgressCourses: 24,
      },
      ownerOverview: {
        totalUsers: 120,
        usersByMonth: [
          { month: '2026-01', count: 10 },
          { month: '2026-02', count: 15 },
          { month: '2026-03', count: 8 },
          { month: '2026-04', count: 0 },
          { month: '2026-05', count: 0 },
          { month: '2026-06', count: 0 },
          { month: '2026-07', count: 0 },
          { month: '2026-08', count: 0 },
          { month: '2026-09', count: 0 },
          { month: '2026-10', count: 0 },
          { month: '2026-11', count: 0 },
          { month: '2026-12', count: 0 },
        ],
        admins: {
          total: 3,
          active: 2,
          invited: 1,
        },
        rewards: {
          redemptionCount: 45,
          usedXp: 1250,
        },
      },
    },
  })
  static example: AdminDashboardAnalyticsDto;
}
