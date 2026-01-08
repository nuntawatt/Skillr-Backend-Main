import { ApiPropertyOptional } from '@nestjs/swagger';
import { CourseResponseDto } from './course-response.dto';

export class CourseDetailResponseDto extends CourseResponseDto {
  @ApiPropertyOptional()
  introVideoPath?: string;

  @ApiPropertyOptional()
  coverImagePath?: string;
}