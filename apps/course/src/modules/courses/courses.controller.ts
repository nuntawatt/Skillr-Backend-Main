import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request, BadRequestException } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { JwtAuthGuard, RolesGuard, Roles } from '@auth';
import type { AuthUser } from '@auth';
import { UserRole } from '@common/enums';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ApiTags, Api  } from '@nestjs/swagger';

@ApiTags('Courses Module')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) { }

  @Post()
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.ADMIN)
  create(
    @Body() body: Record<string, unknown>,
    @Request() req: { user?: AuthUser },
  ) {
    // Map front-end fields to internal DTO fields
    const mapped = {
      title: (body['course_name'] ?? body['title']) as unknown,
      description: (body['course_detail'] ?? body['description']) as unknown,
      level: (body['course_level'] ?? body['level']) as unknown,
      price: body['course_price'] ?? body['price'],
      coverMediaId: body['course_cover_id'] ?? body['coverMediaId'],
      introMediaId: body['course_intro_video_id'] ?? body['introMediaId'],
      tags: body['course_tags'] ?? body['tags'],
      categoryId: body['categoryId'],
      ownerId: body['ownerId'],
    } as Record<string, unknown>;

    // Attach authenticated user as owner if present
    const rawUserId = req.user?.sub ?? req.user?.id;
    const requestUserId = typeof rawUserId === 'string' ? Number(rawUserId) : rawUserId;
    if (Number.isFinite(requestUserId as number)) {
      mapped.ownerId = Number(requestUserId);
    }

    const dto = plainToInstance(CreateCourseDto, mapped);
    const errors = validateSync(dto as object, { whitelist: true, forbidNonWhitelisted: false });
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return this.coursesService.create(dto);
  }

  @Get()
  findAll(@Query('is_published') isPublished?: string) {
    return this.coursesService.findAll(isPublished);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateCourseDto: UpdateCourseDto) {
    return this.coursesService.update(id, updateCourseDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.coursesService.remove(id);
  }
}
