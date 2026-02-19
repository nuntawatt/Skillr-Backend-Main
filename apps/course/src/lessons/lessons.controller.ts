import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiParam, ApiQuery, ApiResponse, ApiNoContentResponse, ApiBody } from '@nestjs/swagger';
import { LessonsService } from './lessons.service';
import { CreateLessonDto, UpdateLessonDto, LessonResponseDto, ReorderLessonsDto } from './dto/lesson';
import { JwtAuthGuard, RolesGuard, Roles } from '@auth';
import { UserRole } from '@common/enums/user-role.enum';

@ApiTags('Lessons')
// @ApiTags('Admin | Lessons')
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles(UserRole.ADMIN)
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) { }

  @Post()
  @ApiOperation({ summary: 'สร้างบทเรียนใหม่' })
  @ApiBody({
    type: CreateLessonDto,
    examples: {
      article: {
        summary: 'ตัวอย่าง: บทเรียนแบบบทความ',
        value: {
          lesson_title: 'Introduction to Variables',
          lesson_description: 'Learn about variable types and declarations',
          chapter_id: 1,
          lesson_type: 'article',
          ref_id: 1,
          orderIndex: 0,
          lesson_ImageUrl: 'https://cdn.skillacademy.com/images/abc123.jpg',
          lesson_videoUrl: null
        }
      },
      video: {
        summary: 'ตัวอย่าง: บทเรียนแบบวิดีโอ',
        value: {
          lesson_title: 'Variables in Action',
          lesson_description: 'Watch how variables work in practice',
          chapter_id: 1,
          lesson_type: 'video',
          ref_id: 2,
          orderIndex: 1,
          lesson_ImageUrl: 'https://cdn.skillacademy.com/images/def456.jpg',
          lesson_videoUrl: 'https://cdn.skillacademy.com/videos/abc123.mp4'
        }
      },
      quiz: {
        summary: 'ตัวอย่าง: บทเรียนแบบแบบทดสอบ',
        value: {
          lesson_title: 'Variables Quiz',
          lesson_description: 'Test your knowledge about variables',
          chapter_id: 1,
          lesson_type: 'quiz',
          ref_id: 3,
          orderIndex: 2,
          lesson_ImageUrl: 'https://cdn.skillacademy.com/images/ghi789.jpg',
          lesson_videoUrl: null
        }
      },
      checkpoint: {
        summary: 'ตัวอย่าง: บทเรียนแบบจุดตรวจสอบ',
        value: {
          lesson_title: 'Variables Checkpoint',
          lesson_description: 'Quick check on variable concepts',
          chapter_id: 1,
          lesson_type: 'checkpoint',
          ref_id: 4,
          orderIndex: 3,
          lesson_ImageUrl: 'https://cdn.skillacademy.com/images/jkl012.jpg',
          lesson_videoUrl: null
        }
      }
    }
  })
  @ApiCreatedResponse({ type: LessonResponseDto, description: 'Lesson created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  create(@Body() dto: CreateLessonDto): Promise<LessonResponseDto> {
    return this.lessonsService.create(dto);
  }

  
  // @ApiTags('Student | Lessons')
  // @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'ดึงบทเรียนทั้งหมดสำหรับบท' })
  @ApiQuery({ name: 'chapterId', required: true, type: Number })
  @ApiOkResponse({ type: LessonResponseDto, isArray: true })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  findByChapter(@Query('chapterId', ParseIntPipe) chapterId: number): Promise<LessonResponseDto[]> {
    return this.lessonsService.findByChapter(chapterId);
  }

  // @ApiTags('Student | Lessons')
  // @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'ดึงบทเรียนตาม ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: LessonResponseDto })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<LessonResponseDto> {
    return this.lessonsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'อัปเดตบทเรียนตาม ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: LessonResponseDto })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateLessonDto: UpdateLessonDto): Promise<LessonResponseDto> {
    return this.lessonsService.update(id, updateLessonDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'ลบบทเรียนตาม ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiNoContentResponse({ description: 'Lesson deleted successfully' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.lessonsService.remove(id);
  }

  @Post('reorder')
  @ApiOperation({ summary: 'จัดลำดับบทเรียนภายในบท' })
  @ApiOkResponse({ type: LessonResponseDto, isArray: true })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  reorder(@Body() body: ReorderLessonsDto): Promise<LessonResponseDto[]> {
    return this.lessonsService.reorder(body.chapterId, body.lessonIds);
  }
}
