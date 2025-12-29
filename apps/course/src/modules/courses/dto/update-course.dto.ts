import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseDto } from './create-course.dto';

export class UpdateCourseDto extends PartialType(CreateCourseDto) {
	// Optional compatibility fields used by service/update handlers
	is_published?: boolean;
	coverMediaId?: number;
	introMediaId?: number;
}
