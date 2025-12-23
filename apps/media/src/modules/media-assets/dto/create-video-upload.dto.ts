import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVideoUploadDto {
  @IsOptional()
  @IsString()
  original_filename?: string;

  @IsString()
  mime_type: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  size_bytes: number;
}
