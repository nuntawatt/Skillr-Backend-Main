import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateStudentDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
