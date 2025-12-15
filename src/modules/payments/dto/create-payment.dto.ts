import { Type } from 'class-transformer';
import { IsNumber, IsEnum, IsOptional, Min, IsInt } from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

export class CreatePaymentDto {
  @IsInt()
  @Type(() => Number)
  courseId: number;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;
}
