import { Controller, Get, UseGuards } from '@nestjs/common';
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
        summary: 'ผู้เชี่ยวชาญสุด 100+ วัน',
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
}
