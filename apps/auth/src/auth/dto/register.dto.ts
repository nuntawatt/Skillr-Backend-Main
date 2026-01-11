import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional, } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({ example: 'StrongPassword123', description: 'User password' })
  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters long' })
  @MaxLength(64, { message: 'Password must not exceed 64 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must include at least one uppercase letter, one lowercase letter, and one number',
  })
  @Matches(/^\S+$/, { message: 'Password must not contain whitespace' })
  password: string;

  @ApiProperty({ example: 'John', description: 'First name of the user', required: false })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'Doe', description: 'Last name of the user', required: false })
  @IsString()
  @IsOptional()
  lastName?: string;
}
