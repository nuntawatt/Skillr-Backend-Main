import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CompleteVideoUploadDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  expected_size_bytes?: number;

  @IsOptional()
  @IsString()
  checksum_sha256?: string;
}
