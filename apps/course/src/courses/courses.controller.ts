import { CoursesService } from './courses.service';
import { Controller, Get, Post, Put, Body, Patch, Param, Delete, ParseIntPipe, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { CreateCourseDto, UpdateCourseDto, CourseResponseDto, CourseStructureResponseDto } from './dto';
import { CourseStructureSaveDto } from './dto/course-structure-save.dto';

import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiParam, ApiResponse, ApiNoContentResponse } from '@nestjs/swagger';

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new course' })
  @ApiCreatedResponse({ type: CourseResponseDto, description: 'Course created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  create(@Body() dto: CreateCourseDto): Promise<CourseResponseDto> {
    return this.coursesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all courses with optional filters' })
  @ApiOkResponse({ type: CourseResponseDto, isArray: true })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAll(): Promise<CourseResponseDto[]> {
    return this.coursesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a course by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: CourseResponseDto })
  @ApiResponse({ status: 200, description: 'Course retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<CourseResponseDto> {
    return this.coursesService.findOne(id);
  }

  @Get(':id/structure')
  @ApiOperation({ summary: 'Get the full nested structure of a course' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: CourseStructureResponseDto })
  @ApiResponse({ status: 200, description: 'Course structure retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  getStructure(@Param('id', ParseIntPipe) id: number): Promise<CourseStructureResponseDto> {
    return this.coursesService.getStructure(id);
  }

  @Put(':id/structure')
  @ApiOperation({ summary: 'Save full course structure (transactional)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: CourseStructureResponseDto })
  @ApiResponse({ status: 200, description: 'Course structure saved successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async saveStructure(@Param('id', ParseIntPipe) id: number, @Body() dto: CourseStructureSaveDto): Promise<CourseStructureResponseDto> {
    return this.coursesService.saveStructure(id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a course by ID' })
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a course by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiNoContentResponse({ description: 'Course deleted successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.coursesService.remove(id);
  }
}
