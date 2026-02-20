import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserStreak } from './entities/user-streak.entity';
import { getStreakColor } from './dto/streak-color.dto';

// UTC-based helpers to avoid timezone ambiguity
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function isSameUtcDay(a: Date, b: Date): boolean {
  return startOfUtcDay(a) === startOfUtcDay(b);
}

function diffDaysUtc(a: Date, b: Date): number {
  return Math.floor((startOfUtcDay(a) - startOfUtcDay(b)) / DAY_MS);
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
      const gap = diffDaysUtc(now, streak.lastCompletedAt);
      // Hybrid rule:
      // - gap === 1: keep counter (flame off)
      // - gap >= 2: reset counter
      if (gap >= 2 && (streak.currentStreak ?? 0) !== 0) {
        streak.currentStreak = 0;
        const oldLongest = streak.longestStreak ?? 0;
        streak.currentStreak = 0;
        streak.longestStreak = oldLongest;
        streak.rewardShownAt = null;
        streak = await this.streakRepository.save(streak);
      }
    }

    // Already counted today
    if (streak.lastCompletedAt && isSameUtcDay(now, streak.lastCompletedAt)) {
      return streak;
    }

    const nextCurrent = (streak.currentStreak ?? 0) + 1;
    streak.currentStreak = nextCurrent;
    streak.longestStreak = Math.max(streak.longestStreak ?? 0, nextCurrent);
    streak.lastCompletedAt = now;

    return this.streakRepository.save(streak);
  }

  async getStreak(userId: string): Promise<{ streak: UserStreak; color: ReturnType<typeof getStreakColor>; isReward: boolean; isFlameOn: boolean; }> {
    let streak = await this.ensureStreak(userId);

    const now = new Date();

    if (streak.lastCompletedAt) {
      const gap = diffDaysUtc(now, streak.lastCompletedAt);
      // Hybrid rule:
      // - gap === 1: keep counter (flame off)
      // - gap >= 2: reset counter
      if (gap >= 2 && (streak.currentStreak ?? 0) !== 0) {
        streak.currentStreak = 0;
        const oldLongest = streak.longestStreak ?? 0;
        streak.longestStreak = oldLongest;
        streak.rewardShownAt = null;
        streak = await this.streakRepository.save(streak);
      }
    }

    const isCompletedToday = !!streak.lastCompletedAt && isSameUtcDay(streak.lastCompletedAt, now);
    const isReward =
      isCompletedToday &&
      (!streak.rewardShownAt || !isSameUtcDay(streak.rewardShownAt, now));

    const isFlameOn = isCompletedToday;

    return {
      streak,
      color: getStreakColor(streak.currentStreak),
      isReward,
      isFlameOn,
    };
  }

  private async ensureStreak(userId: string): Promise<UserStreak> {
    let streak = await this.streakRepository.findOne({ where: { userId } });
    if (!streak) {
      await this.streakRepository.upsert(
        {
          userId,
          currentStreak: 0,
          longestStreak: 0,
          lastCompletedAt: null,
        },
        ['userId'],
      );
      streak = await this.streakRepository.findOne({ where: { userId } });
    }
    return streak!;
  }

  async resetStreak(userId: string): Promise<UserStreak> {
    const streak = await this.ensureStreak(userId);
    streak.currentStreak = 0;
    streak.lastCompletedAt = null;
    streak.rewardShownAt = null;
    return this.streakRepository.save(streak);
  }

  async markRewardShown(userId: string): Promise<UserStreak> {
    const streak = await this.ensureStreak(userId);
    streak.rewardShownAt = new Date();
    return this.streakRepository.save(streak);
  }
}
