import { ApiProperty } from '@nestjs/swagger';

export class CheckpointSubmissionDto {
  @ApiProperty({ 
    description: 'Array of selected answers',
    example: ['A', 'C', 'D']
  })
  answers: string[];

  @ApiProperty({ 
    description: 'Time taken in seconds', 
    required: false,
    example: 120
  })
  timeTaken?: number;
}
