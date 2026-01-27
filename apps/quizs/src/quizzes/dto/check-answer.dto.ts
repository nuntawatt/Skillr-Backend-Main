import { IsInt, IsNotEmpty, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CheckAnswerDto {
  @ApiProperty({ example: 1, description: 'ID ของคำถาม' })
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  questionId: number;

  @ApiProperty({
    example: 10,
    description: 'ID ของตัวเลือกที่เลือก (สำหรับ MC/TF)',
  })
  @IsOptional()
  selectedOptionId?: number;

  @ApiProperty({
    example: 'const',
    description: 'คำตอบ (สำหรับประเภทอื่นๆ)',
  })
  @IsOptional()
  answer?: any;
}
