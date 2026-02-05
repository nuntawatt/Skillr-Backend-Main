import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsNumber } from 'class-validator';

export class CheckpointSubmissionDto {
  @ApiProperty({ 
    description: 'Array of selected answers',
    example: ['A', 'C', 'D']
  })
  @IsArray()
  answers: string[];

  @ApiProperty({ 
    description: 'Time taken in seconds', 
    required: false,
    example: 120
  })
  @IsOptional()
  @IsNumber()
  timeTaken?: number;
}
