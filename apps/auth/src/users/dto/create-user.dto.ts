import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { UserRole, AuthProvider } from '@common/enums';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPassword123' })
  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @ApiProperty({ example: 'skllr' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'test' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ example: 'google-oauth2|1234567890' })
  @IsString()
  @IsOptional()
  googleId?: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg' })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({ example: 'GOOGLE', enum: AuthProvider })
  @IsEnum(AuthProvider)
  @IsOptional()
  provider?: AuthProvider;

  @ApiProperty({ example: 'USER', enum: UserRole })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
