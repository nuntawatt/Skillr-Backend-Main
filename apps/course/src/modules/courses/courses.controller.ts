import type { AuthUser } from '@auth';
import { UserRole } from '@common/enums';
import { JwtAuthGuard, RolesGuard, Roles } from '@auth';
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request } from '@nestjs/common';
import { CreateCourseDto, UpdateCourseDto, CourseResponseDto, CourseDetailResponseDto } from './dto';
import { CoursesService } from './courses.service';
import { ApiTags, ApiOperation, ApiConsumes, ApiOkResponse, ApiCreatedResponse, ApiParam, ApiResponse } from '@nestjs/swagger';

@ApiTags('Courses Module')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new course' })
  @ApiConsumes('application/json')
  @ApiResponse({ status: 201, description: 'The course has been successfully created.' })
  @ApiCreatedResponse({ type: CourseResponseDto })
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
  @ApiOkResponse({ type: CourseResponseDto, isArray: true })
  findAll(@Query('is_published') isPublished?: string): Promise<CourseResponseDto[]> {
    return this.coursesService.findAll(isPublished);
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
  @ApiOkResponse({ type: CourseResponseDto })
  update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ): Promise<CourseResponseDto> {
    return this.coursesService.update(id, updateCourseDto);
  }

  @Delete(':id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string): Promise<void> {
    return this.coursesService.remove(id);
  }
}
