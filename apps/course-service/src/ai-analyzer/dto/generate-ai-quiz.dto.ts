import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class GenerateAiQuizDto {
  @ApiPropertyOptional({
    description: 'Language the quiz should be written in (e.g. th, en).',
    example: 'th',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  language?: string;

  @ApiPropertyOptional({
    description: 'Difficulty level.',
    enum: ['easy', 'medium', 'hard'],
    example: 'medium',
  })
  @IsOptional()
  @IsIn(['easy', 'medium', 'hard'])
  difficulty?: 'easy' | 'medium' | 'hard';

  @ApiPropertyOptional({
    description:
      'Additional instructions to influence quiz generation (the service will still enforce JSON-only output format).',
    example: 'ช่วยทำข้อสอบที่เน้นการใช้งานจริง หลีกเลี่ยงคำถามหลอก',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  admin?: string;

  @ApiPropertyOptional({
    deprecated: true,
    description:
      'Deprecated: use `instructions` instead. Additional prompt/instructions to influence quiz generation.',
    example: 'Generate questions that focus on real-world usage; avoid tricky wording.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  prompt?: string;
}
