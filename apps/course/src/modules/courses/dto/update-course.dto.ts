import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseDto } from './create-course.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

<<<<<<< Updated upstream
export class UpdateCourseDto extends PartialType(CreateCourseDto) {}
=======
export class UpdateCourseDto extends PartialType(CreateCourseDto) {
	@ApiPropertyOptional()
	is_published?: boolean;

	@ApiPropertyOptional()
	coverMediaId?: number;

	@ApiPropertyOptional()
	introMediaId?: number;
}
>>>>>>> Stashed changes
