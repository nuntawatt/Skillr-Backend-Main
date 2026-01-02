import { CreateCourseDto } from './create-course.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { Transform } from 'class-transformer';
import { transformOptionalBoolean } from './create-course.dto';

export class UpdateCourseDto extends PartialType(CreateCourseDto) {
  @ApiPropertyOptional({ description: 'Publish status of the course' })
  @IsOptional()
  @IsBoolean()
  @Transform(transformOptionalBoolean)
  is_published?: boolean;
}
