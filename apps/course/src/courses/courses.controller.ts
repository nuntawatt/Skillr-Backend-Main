import { CoursesService } from './courses.service';
import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { CreateCourseDto, UpdateCourseDto, CourseResponseDto, CourseStructureResponseDto } from './dto';

import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiParam, ApiResponse, ApiNoContentResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles } from '@auth';
import { UserRole } from '@common/enums/user-role.enum';

@ApiTags('Courses')
// @ApiTags('Admin | Courses')
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles(UserRole.ADMIN)
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) { }

  @Post()
  @ApiOperation({ summary: 'สร้างคอร์สใหม่' })
  @ApiCreatedResponse({ type: CourseResponseDto, description: 'Course created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  create(@Body() dto: CreateCourseDto): Promise<CourseResponseDto> {
    return this.coursesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'ดึงข้อมูลคอร์สทั้งหมดพร้อมตัวกรองที่เลือกได้' })
  @ApiOkResponse({ type: CourseResponseDto, isArray: true })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAll(): Promise<CourseResponseDto[]> {
    return this.coursesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'ดึงข้อมูลคอร์สด้วย ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: CourseResponseDto })
  @ApiResponse({ status: 200, description: 'Course retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<CourseResponseDto> {
    return this.coursesService.findOne(id);
  }

  @Get(':id/structure')
  @ApiOperation({ summary: 'ดึงโครงสร้างแบบ nested ทั้งหมดของคอร์ส' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: CourseStructureResponseDto })
  @ApiResponse({ status: 200, description: 'Course structure retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  getStructure(@Param('id', ParseIntPipe) id: number): Promise<CourseStructureResponseDto> {
    return this.coursesService.getStructure(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'แก้ไขคอร์สด้วย ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: CourseResponseDto })
  @ApiResponse({ status: 200, description: 'Course updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateCourseDto: UpdateCourseDto): Promise<CourseResponseDto> {
    return this.coursesService.update(id, updateCourseDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'ลบคอร์สด้วย ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Course deleted successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.coursesService.remove(id);
  }
  
}
