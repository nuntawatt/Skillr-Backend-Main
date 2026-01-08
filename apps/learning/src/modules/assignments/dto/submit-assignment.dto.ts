import { IsString, IsOptional } from 'class-validator';

export class SubmitAssignmentDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;
}
