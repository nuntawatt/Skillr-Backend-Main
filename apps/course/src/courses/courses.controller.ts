import type { AuthUser } from '@auth';
import { UserRole } from '@common/enums';
import { JwtAuthGuard, RolesGuard, Roles } from '@auth';
import { CoursesService } from './courses.service';
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request } from '@nestjs/common';
import { CreateCourseDto, UpdateCourseDto, CourseResponseDto, CourseDetailResponseDto } from './dto/course';
import { ApiTags, ApiOperation, ApiConsumes, ApiOkResponse, ApiCreatedResponse, ApiParam, ApiResponse } from '@nestjs/swagger';

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new course' })
  @ApiConsumes('application/json')
  @ApiCreatedResponse({ type: CourseResponseDto })
  @ApiResponse({ status: 201, description: 'The course has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  create(
    @Body() dto: CreateCourseDto,
    @Request() req: { user?: AuthUser },
  ): Promise<CourseResponseDto> {
    const rawUserId = req.user?.sub ?? req.user?.id;
    const requestUserId =
      typeof rawUserId === 'string' ? Number(rawUserId) : rawUserId;

    if (Number.isFinite(requestUserId as number)) {
      dto.ownerId = Number(requestUserId);
    }

    return this.coursesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List courses with search and filters' })
  @ApiOkResponse({ type: CourseResponseDto, isArray: true })
  @ApiResponse({ status: 200, description: 'Courses retrieved successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  findAll(
    @Query('is_published') isPublished?: string,
    @Query('search') search?: string,
    @Query('level') level?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<CourseResponseDto[]> {
    return this.coursesService.findAll({
      isPublished,
      q: search,
      level,
      limit,
      offset,
    });
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: CourseDetailResponseDto })
  @ApiOperation({ summary: 'Get course details by ID' })
  @ApiResponse({ status: 200, description: 'Course details retrieved successfully.' })
  findOne(@Param('id') id: string): Promise<CourseDetailResponseDto> {
    return this.coursesService.findOne(id);
  }

  @Patch(':id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a course by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiConsumes('application/json')
  @ApiOkResponse({ type: CourseResponseDto })
  @ApiResponse({ status: 200, description: 'Course updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Course not found.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ): Promise<CourseResponseDto> {
    return this.coursesService.update(id, updateCourseDto);
  }

  @Delete(':id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a course by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Course deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Course not found.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  remove(@Param('id') id: string): Promise<void> {
    return this.coursesService.remove(id);
  }
}
