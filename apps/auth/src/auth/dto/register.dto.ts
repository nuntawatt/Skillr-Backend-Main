import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional, } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({ example: 'StrongPassword123', description: 'User password' })
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[\x21-\x7E]{12,64}$/,
    {
      message:
        'Password must be 12-64 characters, include uppercase, lowercase, number, and contain no whitespace or emoji',
    },
  )
  @Matches(/^\S+$/, { message: 'Password must not contain whitespace' })
  password: string;

  @ApiProperty({ example: 'skllr', description: 'First name of the user', required: false })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'test', description: 'Last name of the user', required: false })
  @IsString()
  @IsOptional()
  lastName?: string;
}
