import { ApiProperty } from '@nestjs/swagger';
import { StreakColor } from './streak-color.dto';

export class StreakResponseDto {
  @ApiProperty({ 
    example: 7,
    description: 'จำนวนวันติดต่อกันปัจจุบัน'
  })
  currentStreak: number;

  @ApiProperty({ 
    example: 30,
    description: 'สถิติวันติดต่อกันสูงสุดตลอดเวลา'
  })
  longestStreak: number;

  @ApiProperty({ 
    example: '2025-01-07T10:30:00.000Z', 
    nullable: true,
    description: 'เวลา UTC ของการ completion/skip ครั้งล่าสุดที่นับ'
  })
  lastCompletedAt: Date | null;

  @ApiProperty({ 
    example: 'orange', 
    nullable: true,
    description: 'สีตามช่วงวัน: yellow (3+), orange (10+), red (30+), pink (100+), purple (200+)',
    enum: ['yellow', 'orange', 'red', 'pink', 'purple']
  })
  color: StreakColor | null;

  @ApiProperty({ 
    example: true,
    description: 'มี streak ที่สามารถรับรางวัลได้ (currentStreak > 0)'
  })
  isReward: boolean;
}
