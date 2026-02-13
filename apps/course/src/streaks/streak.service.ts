import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserStreak } from './entities/user-streak.entity';
import { getStreakColor } from './dto/streak-color.dto';

// --------------------------------------------
// UTC-based helpers (ป้องกัน timezone bug)
// --------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000; // จำนวน milliseconds ใน 1 วัน

function startOfUtcDay(date: Date): number {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
}

function isSameUtcDay(a: Date, b: Date): boolean {
  return startOfUtcDay(a) === startOfUtcDay(b);
}

function diffDaysUtc(a: Date, b: Date): number {
  return Math.floor(
    (startOfUtcDay(a) - startOfUtcDay(b)) / DAY_MS,
  );
}

@Injectable()
export class StreakService {
  constructor(
    @InjectRepository(UserStreak)
    private readonly streakRepository: Repository<UserStreak>,
  ) {}

  // =========================================================
  // เพิ่ม streak เมื่อ user ทำกิจกรรม
  // =========================================================
  async bumpStreak(
    userId: string,
    now: Date = new Date(),
  ): Promise<UserStreak> {
    const streak = await this.ensureStreak(userId);

    if (streak.lastCompletedAt) {
      const gap = diffDaysUtc(now, streak.lastCompletedAt);

      // ทำซ้ำในวันเดียวกัน → ไม่เพิ่ม
      if (gap === 0) {
        return streak;
      }

      // ขาดมากกว่า 1 วัน → reset
      if (gap > 1) {
        streak.currentStreak = 0;
        streak.rewardShownAt = null;
      }
    }

    // เพิ่ม streak
    const nextCurrent = streak.currentStreak + 1;

    streak.currentStreak = nextCurrent;
    streak.longestStreak = Math.max(
      streak.longestStreak ?? 0,
      nextCurrent,
    );

    streak.lastCompletedAt = now;

    return this.streakRepository.save(streak);
  }

  // =========================================================
  // ดึงข้อมูล streak (ไม่มี side effect)
  // =========================================================
  async getStreak(userId: string): Promise<{
    streak: UserStreak;
    color: ReturnType<typeof getStreakColor>;
    isReward: boolean;
  }> {
    const streak = await this.ensureStreak(userId);

    let effectiveCurrent = streak.currentStreak;

    // คำนวณแบบ read-only ว่าขาดหรือยัง
    if (streak.lastCompletedAt) {
      const gap = diffDaysUtc(new Date(), streak.lastCompletedAt);

      if (gap > 1) {
        effectiveCurrent = 0;
      }
    }

    const isReward =
      effectiveCurrent > 0 &&
      (!streak.rewardShownAt ||
        !isSameUtcDay(streak.rewardShownAt, new Date()));

    return {
      streak: {
        ...streak,
        currentStreak: effectiveCurrent,
      },
      color: getStreakColor(effectiveCurrent),
      isReward,
    };
  }

  // =========================================================
  // สร้าง streak ถ้ายังไม่มี
  // =========================================================
  private async ensureStreak(
    userId: string,
  ): Promise<UserStreak> {
    let streak = await this.streakRepository.findOne({
      where: { userId },
    });

    if (!streak) {
      streak = this.streakRepository.create({
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastCompletedAt: null,
        rewardShownAt: null,
      });

      streak = await this.streakRepository.save(streak);
    }

    return streak;
  }

  // =========================================================
  // บันทึกว่าแสดง reward modal แล้ววันนี้
  // =========================================================
  async markRewardShown(userId: string): Promise<UserStreak> {
    const streak = await this.ensureStreak(userId);

    // ป้องกัน mark ตอน currentStreak = 0
    if (streak.currentStreak > 0) {
      streak.rewardShownAt = new Date();
      return this.streakRepository.save(streak);
    }

    return streak;
  }
}
