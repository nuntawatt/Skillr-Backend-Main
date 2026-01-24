import { IsEmail, IsString, IsOptional, IsEnum } from 'class-validator';
import { UserRole } from '@common/enums';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'skllr' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'test' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg' })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({ example: '6f1d2c9e-...' , required: false })
  @IsString()
  @IsOptional()
  avatar_media_id?: string;

  @ApiProperty({ example: 'USER', enum: UserRole })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
