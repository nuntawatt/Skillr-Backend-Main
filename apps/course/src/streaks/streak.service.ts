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

function addDaysUtc(date: Date, days: number): Date {
  return new Date(startOfUtcDay(date) + days * DAY_MS);
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

    // Apply break if missed at least one full day since last completion
    if (streak.lastCompletedAt) {
      const gap = diffDaysUtc(now, streak.lastCompletedAt);
      if (gap >= 1 && streak.currentStreak !== 0) {
        streak.currentStreak = 0;
        streak = await this.streakRepository.save(streak);
      }
    }

    // Already counted today
    if (streak.lastCompletedAt && isSameUtcDay(now, streak.lastCompletedAt)) {
      return streak;
    }

    const yesterday = streak.lastCompletedAt ? addDaysUtc(streak.lastCompletedAt, 1) : null;
    const isConsecutive = yesterday ? isSameUtcDay(now, yesterday) : false;

    const nextCurrent = isConsecutive ? streak.currentStreak + 1 : 1;
    streak.currentStreak = nextCurrent;
    streak.longestStreak = Math.max(streak.longestStreak ?? 0, nextCurrent);
    streak.lastCompletedAt = now;

    return this.streakRepository.save(streak);
  }

  async getStreak(userId: string): Promise<{ streak: UserStreak; color: ReturnType<typeof getStreakColor>; isReward: boolean; }> {
    let streak = await this.ensureStreak(userId);

    // If user has been inactive for at least one full day after last completion, reset to 0
    if (streak.lastCompletedAt) {
      const gap = diffDaysUtc(new Date(), streak.lastCompletedAt);
      if (gap >= 1 && streak.currentStreak !== 0) {
        streak.currentStreak = 0;
        streak.rewardShownAt = null; // Reset reward shown when streak resets
        streak = await this.streakRepository.save(streak);
      }
    }

    // Calculate isReward: true if currentStreak > 0 AND reward not shown for this streak
    const isReward = streak.currentStreak > 0 && 
      (!streak.rewardShownAt || !isSameUtcDay(streak.rewardShownAt, new Date()));

    return {
      streak,
      color: getStreakColor(streak.currentStreak),
      isReward,
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
