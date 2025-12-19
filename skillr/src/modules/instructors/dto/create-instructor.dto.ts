import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateInstructorDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  expertise?: string;

  @IsOptional()
  @IsString()
  qualification?: string;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}
