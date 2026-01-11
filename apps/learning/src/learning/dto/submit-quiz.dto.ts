import {
  IsArray,
  ValidateNested,
  IsString,
  IsInt,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AnswerDto {
  @IsInt()
  @Type(() => Number)
  questionId: number;

  @IsOptional()
  answer: any;
}

export class SubmitQuizDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}
