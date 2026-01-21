import { IsInt, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVideoPresignDto {
  @IsString()
  original_filename: string;

  @IsString()
  mime_type: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  size_bytes: number;
}