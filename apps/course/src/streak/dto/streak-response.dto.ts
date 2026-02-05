import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StreakResponseDto {
  @ApiProperty({ 
    description: 'จำนวนวันต่อเนื่องปัจจุบัน',
    example: 7,
    minimum: 0
  })
  currentStreak: number;

  @ApiProperty({ 
    description: 'จำนวนวันต่อเนื่องที่ยาวนานที่สุด',
    example: 15,
    minimum: 0
  })
  longestStreak: number;

  @ApiPropertyOptional({ 
    description: 'วันที่ทำกิจกรรมล่าสุด',
    example: '2026-02-05T00:00:00.000Z'
  })
  lastActivityDate?: Date | null;

  @ApiPropertyOptional({ 
    description: 'วันที่เริ่มต้น streak ปัจจุบัน',
    example: '2026-01-30T00:00:00.000Z'
  })
  streakStartDate?: Date | null;

  @ApiProperty({ 
    description: 'สีของ streak ตามระยะเวลา',
    example: 'yellow',
    enum: ['gray', 'yellow', 'orange', 'red', 'pink', 'purple']
  })
  streakColor: string;

  @ApiProperty({ 
    description: 'emoji ของ streak',
    example: '🟡',
    enum: ['⚪', '🟡', '🍊', '🔴', '🩷', '🟣']
  })
  streakEmoji: string;

  @ApiProperty({ 
    description: 'ข้อความแสดงสถานะ streak',
    example: '🔥 7 Days Streak'
  })
  streakText: string;

  @ApiProperty({ 
    description: 'เป็นวันที่ streak เพิ่มขึ้นใหม่หรือไม่',
    example: false
  })
  isNewStreakDay: boolean;

  @ApiProperty({ 
    description: 'streak ถูก break หรือไม่ในการอัปเดตนี้',
    example: false
  })
  didStreakBreak: boolean;
}

export class StreakUpdateDto {
  @ApiPropertyOptional({ 
    description: 'Timezone offset ในหน่วยนาที (UTC offset)',
    example: 420,
    minimum: -720,
    maximum: 840,
    examples: {
      bangkok: { summary: 'Bangkok (UTC+7)', value: 420 },
      london: { summary: 'London (UTC+0)', value: 0 },
      newYork: { summary: 'New York (UTC-5)', value: -300 },
      tokyo: { summary: 'Tokyo (UTC+9)', value: 540 }
    }
  })
  timezoneOffset?: number;
}
