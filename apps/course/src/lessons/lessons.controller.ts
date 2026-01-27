import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Request, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiParam, ApiQuery, ApiNoContentResponse, ApiResponse } from '@nestjs/swagger';
import { LessonsService } from './lessons.service';
import { CreateLessonDto, UpdateLessonDto, LessonResponseDto } from './dto/lesson';

@ApiTags('Lessons')
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new lesson' })
  @ApiCreatedResponse({ type: LessonResponseDto, description: 'Lesson created successfully' })
  create(@Body() dto: CreateLessonDto): Promise<LessonResponseDto> {
    return this.lessonsService.create(dto);
  }

  @Post('article')
  @ApiOperation({ summary: 'Create a new article lesson with content' })
  @ApiCreatedResponse({ type: LessonResponseDto, description: 'Article lesson created successfully' })
  createArticleLesson(
    @Body() body: { title: string; description?: string; chapterId: number; orderIndex?: number; content: any },
  ): Promise<LessonResponseDto> {
    const { content, ...lessonData } = body;
    return this.lessonsService.createArticleLesson(lessonData, content);
  }

  @Get()
  @ApiOperation({ summary: 'Get all lessons for a chapter' })
  @ApiQuery({ name: 'chapterId', required: true, type: Number })
  @ApiOkResponse({ type: LessonResponseDto, isArray: true })
  findByChapter(@Query('chapterId', ParseIntPipe) chapterId: number): Promise<LessonResponseDto[]> {
    return this.lessonsService.findByChapter(chapterId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a lesson by ID with access check' })
  @ApiParam({ name: 'id', type: Number, description: 'Lesson ID' })
  @ApiOkResponse({ type: LessonResponseDto })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - Previous lesson not completed',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Please complete the previous lesson first.' },
        previousLessonId: { type: 'number', example: 5 },
        previousLessonTitle: { type: 'string', example: 'Introduction to Markets' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any
  ): Promise<LessonResponseDto> {
    const userId = req.user?.id || req.headers['x-user-id'] || '1';
    await this.lessonsService.validateLessonAccess(id, userId);
    return this.lessonsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a lesson by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: LessonResponseDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLessonDto: UpdateLessonDto,
  ): Promise<LessonResponseDto> {
    return this.lessonsService.update(id, updateLessonDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a lesson by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiNoContentResponse({ description: 'Lesson deleted successfully' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.lessonsService.remove(id);
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reorder lessons within a chapter' })
  @ApiOkResponse({ type: LessonResponseDto, isArray: true })
  reorder(
    @Body() body: { chapterId: number; lessonIds: number[] },
  ): Promise<LessonResponseDto[]> {
    return this.lessonsService.reorder(body.chapterId, body.lessonIds);
  }
}
