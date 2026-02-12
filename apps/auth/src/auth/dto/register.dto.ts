import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional, } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({ example: 'StrongPassword123', description: 'User password' })
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[\x21-\x7E]{12,64}$/, {
    message:
      'Password must be 12-64 characters, include uppercase, lowercase, number, and contain no whitespace or emoji',
  },)
  password: string;

  @ApiProperty({ example: 'skllr', description: 'First name of the user', required: false })
  @IsString()
  @IsOptional()
  @Matches(/^[\p{L} '\-]+$/u, {
    message:
      "First name may contain letters, spaces, hyphens and apostrophes only",
  })
  @MinLength(1)
  @MaxLength(64)
  firstName?: string;

  @ApiProperty({ example: 'test', description: 'Last name of the user', required: false })
  @IsString()
  @IsOptional()
  @Matches(/^[\p{L} '\-]+$/u, {
    message:
      "Last name may contain letters, spaces, hyphens and apostrophes only",
  })
  @MinLength(1)
  @MaxLength(64)
  lastName?: string;
}
