import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiParam, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles } from '@auth';
import { UserRole } from '@common/enums/user-role.enum';
import { CoursesService } from './courses.service';
import { CourseStructureResponseDto } from './dto';

@ApiTags('Courses | Admin ')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/courses')
export class AdminCoursesController {
    constructor(private readonly coursesService: CoursesService) { }

    @Get(':id/structure')
    @ApiOperation({ summary: 'Admin: ดึงโครงสร้างคอร์สแบบ nested (รวม draft/unpublished)' })
    @ApiParam({ name: 'id', type: Number })
    @ApiOkResponse({ type: CourseStructureResponseDto })
    @ApiResponse({ status: 200, description: 'Course structure retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Course not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    getStructure(@Param('id', ParseIntPipe) id: number): Promise<CourseStructureResponseDto> {
        return this.coursesService.getStructureAdmin(id);
    }
}
