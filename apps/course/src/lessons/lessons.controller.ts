import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Headers, ParseIntPipe } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { CreateLessonResourceDto } from './dto/create-lesson-resource.dto';
import { JwtAuthGuard, RolesGuard, Roles } from '@auth';
import { UserRole } from '@common/enums';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiParam, ApiResponse } from '@nestjs/swagger';


@ApiTags('Lessons')
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) { }

  @Post()
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new lesson' })
  @ApiConsumes('application/json')
  @ApiBody({
    type: CreateLessonDto,
    examples: {
      lesson: {
        summary: 'Example Lesson',
        value: {
          title: 'Introduction to NestJS',
          content_text: 'This is the content of the lesson.',
          media_asset_id: 42,
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'The lesson has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  create(@Body() createLessonDto: CreateLessonDto) {
    return this.lessonsService.create(createLessonDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all lessons, optionally filtered by courseId' })
  @ApiResponse({ status: 200, description: 'List of lessons retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid courseId parameter' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  // ParseIntPipe used on query to ensure courseId is a number when provided
  findAll(@Query('courseId', ParseIntPipe) courseId?: number) {
    return this.lessonsService.findAll(courseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a lesson by ID' })
  @ApiParam({ name: 'id', example: '10' })
  @ApiResponse({ status: 200, description: 'Lesson retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid lesson ID' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  // ParseIntPipe converts & validates the path param before it reaches the service
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lessonsService.findOne(id);
  }

  // Flow: Create Lesson Resource
  @Post(':id/resources')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a resource for a lesson' })
  @ApiParam({ name: 'id', example: '10' })
  @ApiConsumes('application/json')
  @ApiBody({ type: CreateLessonResourceDto })
  @ApiResponse({ status: 201, description: 'Lesson resource created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  // ParseIntPipe ensures lessonId is numeric
  createResource(
    @Param('id', ParseIntPipe) lessonId: number,
    @Body() dto: CreateLessonResourceDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.lessonsService.createResource(lessonId, dto, authorization);
  }

  @Patch(':id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a lesson by ID' })
  @ApiParam({ name: 'id', example: '10' })
  @ApiConsumes('application/json')
  @ApiBody({ type: UpdateLessonDto })
  @ApiResponse({ status: 200, description: 'Lesson updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLessonDto: UpdateLessonDto,
  ) {
    return this.lessonsService.update(id, updateLessonDto);
  }

  @Delete(':id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a lesson by ID' })
  @ApiParam({ name: 'id', example: '10' })
  @ApiResponse({ status: 200, description: 'Lesson deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.lessonsService.remove(id);
  }
}
