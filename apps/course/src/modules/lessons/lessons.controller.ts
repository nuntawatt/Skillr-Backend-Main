import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Headers } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { CreateLessonResourceDto } from './dto/create-lesson-resource.dto';
import { JwtAuthGuard, RolesGuard, Roles } from '@auth';
import { UserRole } from '@common/enums';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiParam, ApiResponse } from '@nestjs/swagger';

@ApiTags('Lessons Module')
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
          content_text: 'This is the content of the lesson.'
        }
      }
    }
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
  findAll(@Query('courseId') courseId?: string) {
    return this.lessonsService.findAll(courseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a lesson by ID' })
  @ApiParam({
    name: 'id',
    example: '10'
  })
  @ApiResponse({ status: 200, description: 'Lesson retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid lesson ID' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  findOne(@Param('id') id: string) {
    return this.lessonsService.findOne(id);
  }

  // Flow: Create Lesson Resource
  @Post(':id/resources')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a resource for a lesson' })
  @ApiParam({
    name: 'id',
    example: '10'
  })
  @ApiConsumes('application/json')
  @ApiBody({ type: CreateLessonResourceDto })
  @ApiResponse({ status: 201, description: 'Lesson resource created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  createResource(
    @Param('id') lessonId: string,
    @Body() dto: CreateLessonResourceDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.lessonsService.createResource(lessonId, dto, authorization);
  }

  @Patch(':id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a lesson by ID' })
  @ApiParam({
    name: 'id',
    example: '10'
  })
  @ApiResponse({ status: 200, description: 'Lesson updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  update(@Param('id') id: string, @Body() updateLessonDto: UpdateLessonDto) {
    return this.lessonsService.update(id, updateLessonDto);
  }

  @Delete(':id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a lesson by ID' })
  @ApiParam({
    name: 'id',
    example: '10'
  })
  @ApiResponse({ status: 200, description: 'Lesson deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  remove(@Param('id') id: string) {
    return this.lessonsService.remove(id);
  }
}
