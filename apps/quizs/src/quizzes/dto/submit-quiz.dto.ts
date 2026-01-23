import {
  IsArray,
  ValidateNested,
  IsString,
  IsInt,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AnswerDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Type(() => Number)
  questionId: number;

  @ApiProperty({
    example: '2',
    description: 'คำตอบ (String สำหรับ MC, Boolean สำหรับ T/F, Array สำหรับ Match/Order)',
  })
  @IsOptional()
  answer: any;
}

export class SubmitQuizDto {
  @ApiProperty({
    type: [AnswerDto],
    example: [
      { questionId: 1, answer: 'แอปเปิ้ล' },
      {
        questionId: 2,
        answer: [
          { left: 'ท้องฟ้า', right: 'สีน้ำเงิน' },
          { left: 'กล้วยหอม', right: 'สีเหลือง' },
        ],
      },
      { questionId: 3, answer: ['ชโลมสบู่', 'ถูมือให้สะอาด', 'ล้างด้วยน้ำเปล่า'] },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}
