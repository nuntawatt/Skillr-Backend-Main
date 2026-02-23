import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserStreak } from './entities/user-streak.entity';
import { getStreakColor } from './dto/streak-color.dto';

// เรียกใช้ฟังก์ชันนี้เพื่อคำนวณสีของ streak ตามจำนวนวันที่ต่อเนื่อง
const DAY_MS = 24 * 60 * 60 * 1000;

// บังคับใช้ timezone ไทย (UTC+7)
// ไม่ว่า server จะอยู่ที่ไหน จะ reset 00:00 ตามเวลาไทยเสมอ
function startOfBangkokDay(date: Date): number {
  const offsetMs = 7 * 60 * 60 * 1000;
  const bangkokTime = new Date(date.getTime() + offsetMs);

  return Date.UTC(
    bangkokTime.getUTCFullYear(),
    bangkokTime.getUTCMonth(),
    bangkokTime.getUTCDate()
  );
}

function isSameBangkokDay(a: Date, b: Date): boolean {
  return startOfBangkokDay(a) === startOfBangkokDay(b);
}

function diffDaysBangkok(a: Date, b: Date): number {
  return Math.floor(
    (startOfBangkokDay(a) - startOfBangkokDay(b)) / DAY_MS
  );
}


@Injectable()
export class StreakService {
  constructor(
    @InjectRepository(UserStreak)
    private readonly streakRepository: Repository<UserStreak>,
  ) { }

  async bumpStreak(userId: string, now: Date = new Date()): Promise<UserStreak> {
    let streak = await this.ensureStreak(userId);

    if (streak.lastCompletedAt) {
      const gap = diffDaysBangkok(now, streak.lastCompletedAt);

      // ถ้ามีช่องว่าง 2 วันขึ้นไป -> reset counter
      if (gap >= 2 && (streak.currentStreak ?? 0) !== 0) {
        streak.currentStreak = 0;
        streak.rewardShownAt = null;
        streak = await this.streakRepository.save(streak);
        // const oldLongest = streak.longestStreak ?? 0;
        // streak.longestStreak = oldLongest;
      }
    }

    // ถ้าทำวันนี้ไปแล้ว ให้ไม่ต้องอัปเดตอะไร
    if (streak.lastCompletedAt && isSameBangkokDay(now, streak.lastCompletedAt)) {
      return streak;
    }

    const nextCurrent = (streak.currentStreak ?? 0) + 1;

    streak.currentStreak = nextCurrent;
    streak.longestStreak = Math.max(streak.longestStreak ?? 0, nextCurrent);
    streak.lastCompletedAt = now;

    return this.streakRepository.save(streak);
  }

  // ฟังก์ชันนี้จะถูกเรียกเมื่อผู้ใช้เข้ามาดูหน้า Home เพื่อเช็คว่าสถิติ streak ยังถูกต้องอยู่ไหม (เช่น ถ้าขาดไป 2 วันแล้ว แต่ยังไม่ได้ทำอะไรเลย ก็จะรีเซ็ตสถิติให้)
  async getStreak(userId: string): Promise<{
    streak: UserStreak;
    color: ReturnType<typeof getStreakColor>;
    isReward: boolean;
    isFlameOn: boolean;
  }> {
    let streak = await this.ensureStreak(userId);
    const now = new Date();

    if (streak.lastCompletedAt) {
      const gap = diffDaysBangkok(now, streak.lastCompletedAt);

      // gap === 1 -> flame off แต่ counter คงอยู่
      // gap >= 2 -> reset counter
      if (gap >= 2 && (streak.currentStreak ?? 0) !== 0) {
        streak.currentStreak = 0;
        streak.rewardShownAt = null;
        streak = await this.streakRepository.save(streak);
        // const oldLongest = streak.longestStreak ?? 0;
        // streak.longestStreak = oldLongest;
      }
    }

    // เช็คว่าวันนี้ทำไปแล้วหรือยัง
    const isCompletedToday = !!streak.lastCompletedAt && isSameBangkokDay(streak.lastCompletedAt, now);

    // ถ้าทำวันนี้ไปแล้ว และยังไม่เคยแสดงรางวัลวันนี้เลย ให้แสดงรางวัล
    const isReward = isCompletedToday && (!streak.rewardShownAt || !isSameBangkokDay(streak.rewardShownAt, now));

    const isFlameOn = isCompletedToday;

    return {
      streak,
      color: getStreakColor(streak.currentStreak),
      isReward,
      isFlameOn,
    };
  }

  // ฟังก์ชันนี้จะถูกเรียกเมื่อผู้ใช้เข้ามาดูหน้า Home เพื่อเช็คว่าสถิติ streak ยังถูกต้องอยู่ไหม (เช่น ถ้าขาดไป 2 วันแล้ว แต่ยังไม่ได้ทำอะไรเลย ก็จะรีเซ็ตสถิติให้)
  async markRewardShown(userId: string): Promise<UserStreak> {
    const streak = await this.ensureStreak(userId);
    streak.rewardShownAt = new Date();
    return this.streakRepository.save(streak);
  }

  // ฟังก์ชันสำหรับการทดสอบ เพื่อจำลองสถานการณ์ต่างๆ ของ streak (เช่น การทำติดต่อกัน, การขาดวัน แล้วกลับมาทำต่อ)
  async resetStreak(userId: string): Promise<UserStreak> {
    const streak = await this.ensureStreak(userId);
    streak.currentStreak = 0;
    streak.lastCompletedAt = null;
    streak.rewardShownAt = null;
    return this.streakRepository.save(streak);
  }

  // ฟังก์ชันนี้จะถูกเรียกเมื่อผู้ใช้เข้ามาดูหน้า Home เพื่อเช็คว่าสถิติ streak ยังถูกต้องอยู่ไหม (เช่น ถ้าขาดไป 2 วันแล้ว แต่ยังไม่ได้ทำอะไรเลย ก็จะรีเซ็ตสถิติให้)
  private async ensureStreak(userId: string): Promise<UserStreak> {
    let streak = await this.streakRepository.findOne({ where: { userId } });

    // ถ้ายังไม่มีสถิติของผู้ใช้คนนี้เลย ให้สร้างขึ้นมาใหม่
    if (!streak) {
      await this.streakRepository.upsert(
        {
          userId,
          currentStreak: 0,
          longestStreak: 0,
          lastCompletedAt: null,
          rewardShownAt: null,
        },
        ['userId'],
      );
      streak = await this.streakRepository.findOne({ where: { userId } });
    }
    return streak!;
  }



}