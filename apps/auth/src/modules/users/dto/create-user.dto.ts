import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { UserRole, AuthProvider } from '@common/enums';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  googleId?: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsEnum(AuthProvider)
  @IsOptional()
  provider?: AuthProvider;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
