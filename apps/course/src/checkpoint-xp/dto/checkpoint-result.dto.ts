import { ApiProperty } from '@nestjs/swagger';

export class CheckpointResultDto {
  @ApiProperty({ 
    description: 'Whether the answer is correct',
    example: true
  })
  isCorrect: boolean;

  @ApiProperty({ 
    description: 'XP earned from this checkpoint',
    example: 5
  })
  xpEarned: number;

  @ApiProperty({ 
    description: 'Feedback message',
    example: 'ได้รับ 5 XP'
  })
  feedback: string;

  @ApiProperty({ 
    description: 'Total XP for this chapter',
    example: 5
  })
  totalChapterXp: number;

  @ApiProperty({ 
    description: 'Checkpoint status',
    enum: ['PENDING', 'COMPLETED', 'SKIPPED'],
    example: 'COMPLETED'
  })
  checkpointStatus: 'PENDING' | 'COMPLETED' | 'SKIPPED';

  @ApiProperty({ 
    description: 'Whether XP was already earned before',
    example: false
  })
  wasXpAlreadyEarned: boolean;
}
