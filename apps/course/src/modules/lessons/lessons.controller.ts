import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Headers,
} from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { CreateLessonResourceDto } from './dto/create-lesson-resource.dto';
import { JwtAuthGuard, RolesGuard, Roles } from '@auth';
import { UserRole } from '@common/enums';

@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() createLessonDto: CreateLessonDto) {
    return this.lessonsService.create(createLessonDto);
  }

  @Get()
  findAll(@Query('courseId') courseId?: string) {
    return this.lessonsService.findAll(courseId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.lessonsService.findOne(id);
  }

  // ตาม flow: ผูกวิดีโอเข้ากับ Lesson (สร้าง lesson_resources)
  @Post(':id/resources')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createResource(
    @Param('id') lessonId: string,
    @Body() dto: CreateLessonResourceDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.lessonsService.createResource(lessonId, dto, authorization);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateLessonDto: UpdateLessonDto) {
    return this.lessonsService.update(id, updateLessonDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.lessonsService.remove(id);
  }
}
