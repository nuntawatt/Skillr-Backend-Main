import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiParam, ApiQuery, ApiResponse, ApiNoContentResponse, ApiBody } from '@nestjs/swagger';
import { LessonsService } from './lessons.service';
import { CreateLessonDto, UpdateLessonDto, LessonResponseDto, ReorderLessonsDto } from './dto/lesson';

@ApiTags('Lessons')
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new lesson' })
  @ApiCreatedResponse({ type: LessonResponseDto, description: 'Lesson created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  create(@Body() dto: CreateLessonDto): Promise<LessonResponseDto> {
    return this.lessonsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all lessons for a chapter' })
  @ApiQuery({ name: 'chapterId', required: true, type: Number })
  @ApiOkResponse({ type: LessonResponseDto, isArray: true })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  findByChapter(@Query('chapterId', ParseIntPipe) chapterId: number): Promise<LessonResponseDto[]> {
    return this.lessonsService.findByChapter(chapterId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a lesson by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: LessonResponseDto })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<LessonResponseDto> {
    return this.lessonsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a lesson by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: LessonResponseDto })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateLessonDto: UpdateLessonDto): Promise<LessonResponseDto> {
    return this.lessonsService.update(id, updateLessonDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a lesson by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiNoContentResponse({ description: 'Lesson deleted successfully' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.lessonsService.remove(id);
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reorder lessons within a chapter' })
  @ApiOkResponse({ type: LessonResponseDto, isArray: true })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  reorder(@Body() body: ReorderLessonsDto): Promise<LessonResponseDto[]> {
    return this.lessonsService.reorder(body.chapterId, body.lessonIds);
  }
}
