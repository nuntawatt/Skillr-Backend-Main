import { Controller, Get, Post, UseGuards, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth';
import { CurrentUserId } from './decorators/current-user-id.decorator';
import { StreakService } from './streak.service';
import { StreakResponseDto } from './dto/streak-response.dto';

@ApiTags('Streaks')
@Controller('streaks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StreakController {
  constructor(private readonly streakService: StreakService) {}

  @Get()
  @ApiOperation({ 
    summary: 'ดึงข้อมูล streak ปัจจุบันของผู้ใช้',
    description: 'คืนข้อมูลวันติดต่อกันปัจจุบัน สถิติสูงสุด และสีตามช่วงวัน\n\n**Authentication:** ต้องมี JWT token ใน header\n**User ID:** ดึงจาก JWT token (sub หรือ userId field)\n**Testing:** ใช้ test UUID: `123e4567-e89b-12d3-a456-426614174000`'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'ดึงข้อมูล streak สำเร็จ',
    examples: {
      'new_user': {
        summary: 'ผู้ใช้ใหม่ (ยังไม่มี streak)',
        value: {
          currentStreak: 0,
          longestStreak: 0,
          lastCompletedAt: null,
          color: null
        }
      },
      'beginner': {
        summary: 'ผู้เริ่มต้น (1-2 วัน)',
        value: {
          currentStreak: 2,
          longestStreak: 2,
          lastCompletedAt: '2025-01-02T10:30:00.000Z',
          color: null
        }
      },
      'intermediate': {
        summary: 'ผู้ใช้ระดับกลาง (3-9 วัน)',
        value: {
          currentStreak: 7,
          longestStreak: 15,
          lastCompletedAt: '2025-01-07T09:15:00.000Z',
          color: 'yellow'
        }
      },
      'advanced': {
        summary: 'ผู้ใช้ขั้นสูง (10-29 วัน)',
        value: {
          currentStreak: 12,
          longestStreak: 25,
          lastCompletedAt: '2025-01-12T14:20:00.000Z',
          color: 'orange'
        }
      },
      'expert': {
        summary: 'ผู้เชี่ยวชาญ (30-99 วัน)',
        value: {
          currentStreak: 45,
          longestStreak: 60,
          lastCompletedAt: '2025-01-12T08:45:00.000Z',
          color: 'red'
        }
      },
      'master': {
        summary: 'ผู้เชี่ยวชาญสูงสุด 100+ วัน',
        value: {
          currentStreak: 105,
          longestStreak: 120,
          lastCompletedAt: '2025-01-12T11:30:00.000Z',
          color: 'pink'
        }
      },
      'legend': {
        summary: 'ระดับตำนาน (200+ วัน)',
        value: {
          currentStreak: 250,
          longestStreak: 250,
          lastCompletedAt: '2025-01-12T07:00:00.000Z',
          color: 'purple'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'ไม่ได้รับอนุญาต (ไม่มี JWT token)'
  })
  async getStreak(@CurrentUserId() userId: string): Promise<StreakResponseDto> {
    const { streak, color } = await this.streakService.getStreak(userId);
    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastCompletedAt: streak.lastCompletedAt,
      color,
    };
  }

  // DEV ONLY: Test endpoints
  @Post('test/bump')
  @ApiOperation({ 
    summary: '[DEV] Test bump streak with custom date',
    description: 'ทดสอบการ bump streak โดยระบุวันที่เอง (สำหรับ development เท่านั้น)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Bump streak สำเร็จ',
    examples: {
      'first_day': {
        summary: 'วันแรกของ streak',
        value: {
          currentStreak: 1,
          longestStreak: 1,
          lastCompletedAt: '2025-01-01T10:00:00.000Z',
          color: null
        }
      },
      'consecutive_day': {
        summary: 'วันติดต่อกัน',
        value: {
          currentStreak: 3,
          longestStreak: 3,
          lastCompletedAt: '2025-01-03T10:00:00.000Z',
          color: 'yellow'
        }
      },
      'after_reset': {
        summary: 'หลังจากขาดวัน (reset)',
        value: {
          currentStreak: 1,
          longestStreak: 3,
          lastCompletedAt: '2025-01-05T10:00:00.000Z',
          color: null
        }
      }
    }
  })
  async testBumpStreak(
    @CurrentUserId() userId: string,
    @Body() body: { date: string }
  ): Promise<StreakResponseDto> {
    const testDate = new Date(body.date);
    const streak = await this.streakService.bumpStreak(userId, testDate);
    const { streak: currentStreak, color } = await this.streakService.getStreak(userId);
    
    return {
      currentStreak: currentStreak.currentStreak,
      longestStreak: currentStreak.longestStreak,
      lastCompletedAt: currentStreak.lastCompletedAt,
      color,
    };
  }

  @Post('test/reset')
  @ApiOperation({ 
    summary: '[DEV] Reset user streak',
    description: 'รีเซ็ต streak ของผู้ใช้ (สำหรับ development เท่านั้น)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Reset streak สำเร็จ',
    examples: {
      'success': {
        summary: 'รีเซ็ตสำเร็จ',
        value: {
          message: 'Streak reset successfully'
        }
      }
    }
  })
  async testResetStreak(@CurrentUserId() userId: string): Promise<{ message: string }> {
    await this.streakService.resetStreak(userId);
    return { message: 'Streak reset successfully' };
  }

  @Get('test/status')
  @ApiOperation({ 
    summary: '[DEV] Get detailed streak status for testing',
    description: 'ดึงข้อมูลละเอียดสำหรับทดสอบ (สำหรับ development เท่านั้น)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'ดึงข้อมูลสำเร็จ',
    examples: {
      'active_streak': {
        summary: 'มี streak ที่กำลังทำอยู่',
        value: {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          currentStreak: 5,
          longestStreak: 12,
          lastCompletedAt: '2025-01-05T10:00:00.000Z',
          color: 'yellow',
          serverTime: '2025-01-05T15:30:00.000Z',
          serverTimeUTC: 'Mon, 05 Jan 2025 15:30:00 GMT',
          lastCompletedDays: 0
        }
      },
      'broken_streak': {
        summary: 'streak หมดอายุ (reset)',
        value: {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          currentStreak: 0,
          longestStreak: 12,
          lastCompletedAt: '2025-01-03T10:00:00.000Z',
          color: null,
          serverTime: '2025-01-05T15:30:00.000Z',
          serverTimeUTC: 'Mon, 05 Jan 2025 15:30:00 GMT',
          lastCompletedDays: 2
        }
      },
      'new_user': {
        summary: 'ผู้ใช้ใหม่ (ยังไม่เคยทำ)',
        value: {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          currentStreak: 0,
          longestStreak: 0,
          lastCompletedAt: null,
          color: null,
          serverTime: '2025-01-05T15:30:00.000Z',
          serverTimeUTC: 'Mon, 05 Jan 2025 15:30:00 GMT',
          lastCompletedDays: null
        }
      }
    }
  })
  async testGetStatus(@CurrentUserId() userId: string): Promise<any> {
    const { streak, color } = await this.streakService.getStreak(userId);
    const now = new Date();
    
    return {
      userId,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastCompletedAt: streak.lastCompletedAt,
      color,
      serverTime: now.toISOString(),
      serverTimeUTC: now.toUTCString(),
      lastCompletedDays: streak.lastCompletedAt ? 
        Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 
                   Date.UTC(streak.lastCompletedAt.getUTCFullYear(), streak.lastCompletedAt.getUTCMonth(), streak.lastCompletedAt.getUTCDate())) / (24 * 60 * 60 * 1000)) : null
    };
  }
}
