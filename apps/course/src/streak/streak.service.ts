import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserStreak } from './entities/user-streak.entity';
import { StreakResponseDto, StreakUpdateDto } from './dto';

@Injectable()
export class StreakService {
  constructor(
    @InjectRepository(UserStreak)
    private readonly userStreakRepository: Repository<UserStreak>,
  ) {}

  async getUserStreak(userId: string, timezoneOffset = 0): Promise<StreakResponseDto> {
    let userStreak = await this.userStreakRepository.findOne({
      where: { userId },
    });

    if (!userStreak) {
      userStreak = this.userStreakRepository.create({
        userId,
        currentStreak: 0,
        longestStreak: 0,
        timezoneOffset,
      });
      await this.userStreakRepository.save(userStreak);
    }

    return this.formatStreakResponse(userStreak);
  }

  async updateStreakOnActivity(
    userId: string,
    timezoneOffset = 0,
  ): Promise<StreakResponseDto> {
    let userStreak = await this.userStreakRepository.findOne({
      where: { userId },
    });

    if (!userStreak) {
      userStreak = this.userStreakRepository.create({
        userId,
        currentStreak: 0,
        longestStreak: 0,
        timezoneOffset,
      });
    }

    const today = this.getLocalDate(new Date(), timezoneOffset);
    const lastActivityDate = userStreak.lastActivityDate
      ? this.getLocalDate(userStreak.lastActivityDate, timezoneOffset)
      : null;

    let isNewStreakDay = false;
    let didStreakBreak = false;

    if (!lastActivityDate) {
      // First activity - start streak at day 1
      userStreak.currentStreak = 1;
      userStreak.longestStreak = 1;
      userStreak.streakStartDate = today;
      userStreak.lastActivityDate = today;
      isNewStreakDay = true;
    } else {
      const daysDiff = this.getDaysDifference(lastActivityDate, today);

      if (daysDiff === 0) {
        // Same day - no change to streak
        // Streak only increases once per day
      } else if (daysDiff === 1) {
        // Next day - increase streak
        userStreak.currentStreak += 1;
        userStreak.lastActivityDate = today;
        isNewStreakDay = true;

        // Update longest streak if needed
        if (userStreak.currentStreak > userStreak.longestStreak) {
          userStreak.longestStreak = userStreak.currentStreak;
        }
      } else {
        // Missed days - reset streak
        didStreakBreak = true;
        userStreak.currentStreak = 1;
        userStreak.streakStartDate = today;
        userStreak.lastActivityDate = today;
        isNewStreakDay = true;
      }
    }

    userStreak.timezoneOffset = timezoneOffset;
    await this.userStreakRepository.save(userStreak);

    return this.formatStreakResponse(userStreak, isNewStreakDay, didStreakBreak);
  }

  async updateTimezone(userId: string, timezoneOffset: number): Promise<void> {
    await this.userStreakRepository.update(
      { userId },
      { timezoneOffset }
    );
  }

  private formatStreakResponse(
    userStreak: UserStreak,
    isNewStreakDay = false,
    didStreakBreak = false,
  ): StreakResponseDto {
    const { streakColor, streakEmoji } = this.getStreakAppearance(userStreak.currentStreak);
    const streakText = this.getStreakText(userStreak.currentStreak);

    return {
      currentStreak: userStreak.currentStreak,
      longestStreak: userStreak.longestStreak,
      lastActivityDate: userStreak.lastActivityDate,
      streakStartDate: userStreak.streakStartDate,
      streakColor,
      streakEmoji,
      streakText,
      isNewStreakDay,
      didStreakBreak,
    };
  }

  private getStreakAppearance(streakDays: number): { streakColor: string; streakEmoji: string } {
    if (streakDays >= 200) {
      return { streakColor: 'purple', streakEmoji: '🟣' };
    } else if (streakDays >= 100) {
      return { streakColor: 'pink', streakEmoji: '🩷' };
    } else if (streakDays >= 30) {
      return { streakColor: 'red', streakEmoji: '🔴' };
    } else if (streakDays >= 10) {
      return { streakColor: 'orange', streakEmoji: '🍊' };
    } else if (streakDays >= 3) {
      return { streakColor: 'yellow', streakEmoji: '🟡' };
    } else {
      return { streakColor: 'gray', streakEmoji: '⚪' };
    }
  }

  private getStreakText(streakDays: number): string {
    if (streakDays === 0) {
      return 'เริ่มต้นสร้าง Streak กันเลย!';
    } else if (streakDays === 1) {
      return '🔥 1 Day Streak';
    } else {
      return `🔥 ${streakDays} Days Streak`;
    }
  }

  private getLocalDate(date: Date, timezoneOffset: number): Date {
    const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    return new Date(utcDate.getTime() + timezoneOffset * 60000);
  }

  private getDaysDifference(date1: Date, date2: Date): number {
    const timeDiff = date2.getTime() - date1.getTime();
    return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  }
}
