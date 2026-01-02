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
  Request,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { JwtAuthGuard, RolesGuard, Roles } from '@auth';
import type { AuthUser } from '@auth';
import { UserRole } from '@common/enums';
<<<<<<< Updated upstream
=======
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiParam, ApiResponse } from '@nestjs/swagger';
>>>>>>> Stashed changes

@ApiTags('Courses Module')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new course' })
  @ApiConsumes('application/json')
  @ApiBody({
    description: 'Data for the new course',
    schema: {
      type: 'object',
      properties: {
        course_name: { type: 'string', description: 'Name of the course', example: 'Introduction to Programming' },
        course_detail: { type: 'string', description: 'Detailed description of the course', example: 'This course covers the basics of programming.' },
        course_level: { type: 'string', description: 'Difficulty level of the course', example: 'Beginner' },
        course_price: { type: 'number', description: 'Price of the course', example: 49.99 },
        course_cover_id: { type: 'number', description: 'Media ID for the course cover image', example: 101 },
        course_intro_video_id: { type: 'number', description: 'Media ID for the course introduction video', example: 202 },
        course_tags: { type: 'array', items: { type: 'string' }, description: 'Tags associated with the course', example: ['programming', 'basics'] },
        categoryId: { type: 'number', description: 'Category ID for the course', example: 5 },
        ownerId: { type: 'number', description: 'Owner user ID for the course', example: 1 },
      },
      required: ['course_name', 'course_detail', 'course_level', 'course_price'],
    },
  })
  @ApiResponse({ status: 201, description: 'The course has been successfully created' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  create(
    @Body() createCourseDto: CreateCourseDto,
    @Request() req: { user?: AuthUser },
  ) {
    const rawUserId = req.user?.sub ?? req.user?.id;
    const requestUserId =
      typeof rawUserId === 'string' ? Number(rawUserId) : rawUserId;
    // No-login flow: if no user on request, keep ownerId from body.
    if (Number.isFinite(requestUserId as number)) {
      createCourseDto.ownerId = Number(requestUserId);
    }

    return this.coursesService.create(createCourseDto);
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
