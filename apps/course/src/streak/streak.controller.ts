import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/src/auth/guards/jwt-auth.guard';
import { StreakService } from './streak.service';
import { StreakResponseDto, StreakUpdateDto } from './dto';

@ApiTags('Streak')
@ApiBearerAuth()
@Controller('streak')
@UseGuards(JwtAuthGuard)
export class StreakController {
  constructor(private readonly streakService: StreakService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get user streak information',
    description: 'ดึงข้อมูล streak ปัจจุบันของผู้ใช้ รวมถึงจำนวนวันต่อเนื่อง สี และข้อความแสดงสถานะ'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Successfully retrieved streak information',
    example: {
      currentStreak: 7,
      longestStreak: 15,
      lastActivityDate: '2026-02-05T00:00:00.000Z',
      streakStartDate: '2026-01-30T00:00:00.000Z',
      streakColor: 'yellow',
      streakEmoji: '🟡',
      streakText: '🔥 7 Days Streak',
      isNewStreakDay: false,
      didStreakBreak: false
    }
  })
  async getUserStreak(@Request() req): Promise<StreakResponseDto> {
    const userId = req.user.userId;
    const timezoneOffset = req.body.timezoneOffset || 0;
    return this.streakService.getUserStreak(userId, timezoneOffset);
  }

  @Post('activity')
  @ApiOperation({ 
    summary: 'Update streak on activity completion',
    description: 'อัปเดต streak เมื่อผู้ใช้ทำกิจกรรมเสร็จ (เรียนบทเรียน/ทำ quiz/ข้าม checkpoint) ระบบจะคำนวณว่าเป็นวันใหม่หรือไม่'
  })
  @ApiBody({
    type: StreakUpdateDto,
    examples: {
      example1: {
        summary: 'Bangkok timezone (UTC+7)',
        value: { timezoneOffset: 420 }
      },
      example2: {
        summary: 'Default timezone (UTC)',
        value: { timezoneOffset: 0 }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Successfully updated streak',
    example: {
      currentStreak: 8,
      longestStreak: 15,
      lastActivityDate: '2026-02-05T00:00:00.000Z',
      streakStartDate: '2026-01-30T00:00:00.000Z',
      streakColor: 'yellow',
      streakEmoji: '🟡',
      streakText: '🔥 8 Days Streak',
      isNewStreakDay: true,
      didStreakBreak: false
    }
  })
  async updateStreakOnActivity(
    @Request() req,
    @Body() updateDto?: StreakUpdateDto,
  ): Promise<StreakResponseDto> {
    const userId = req.user.userId;
    const timezoneOffset = updateDto?.timezoneOffset || 0;
    return this.streakService.updateStreakOnActivity(userId, timezoneOffset);
  }

  @Post('timezone')
  @ApiOperation({ 
    summary: 'Update user timezone',
    description: 'อัปเดด timezone offset ของผู้ใช้เพื่อคำนวณ streak ให้ถูกต้องตามเขตเวลา'
  })
  @ApiBody({
    type: StreakUpdateDto,
    examples: {
      bangkok: {
        summary: 'Bangkok (UTC+7)',
        value: { timezoneOffset: 420 }
      },
      london: {
        summary: 'London (UTC+0)',
        value: { timezoneOffset: 0 }
      },
      newYork: {
        summary: 'New York (UTC-5)',
        value: { timezoneOffset: -300 }
      },
      tokyo: {
        summary: 'Tokyo (UTC+9)',
        value: { timezoneOffset: 540 }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Timezone updated successfully',
    example: { message: 'Timezone updated successfully' }
  })
  async updateTimezone(
    @Request() req,
    @Body() updateDto: StreakUpdateDto,
  ): Promise<{ message: string }> {
    const userId = req.user.userId;
    const timezoneOffset = updateDto.timezoneOffset ?? 0;
    await this.streakService.updateTimezone(userId, timezoneOffset);
    return { message: 'Timezone updated successfully' };
  }
}
