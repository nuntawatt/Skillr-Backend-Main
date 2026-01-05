import { IsEmail, IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  email: string;

  @IsString()
  @ApiProperty({ example: 'strongPassword123', description: 'User password' })
  password: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ example: true, description: 'Remember me option' })
  rememberMe?: boolean;
}
