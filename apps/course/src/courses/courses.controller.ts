import { CoursesService } from './courses.service';
import {Controller,Get,Post,Put,Body,Patch,Param,Delete,Query,ParseIntPipe,HttpCode,HttpStatus} from '@nestjs/common';
import {CreateCourseDto,UpdateCourseDto,CourseResponseDto,CourseStructureResponseDto} from './dto';
import { CourseStructureSaveDto } from './dto/course-structure-save.dto';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
  ApiQuery,
  ApiNoContentResponse,
} from '@nestjs/swagger';

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new course' })
  @ApiCreatedResponse({ type: CourseResponseDto, description: 'Course created successfully' })
  create(@Body() dto: CreateCourseDto): Promise<CourseResponseDto> {
    return this.coursesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List courses with optional filters' })
  @ApiOkResponse({ type: CourseResponseDto, isArray: true })
  @ApiQuery({ name: 'isPublished', required: false, type: Boolean })
  @ApiQuery({ name: 'ownerUserId', required: false, type: Number })
  @ApiQuery({ name: 'categoryId', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  findAll(
    @Query('isPublished') isPublished?: string,
    @Query('ownerUserId') ownerUserId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<CourseResponseDto[]> {
    return this.coursesService.findAll({
      isPublished: isPublished === 'true' ? true : isPublished === 'false' ? false : undefined,
      ownerUserId: ownerUserId ? parseInt(ownerUserId, 10) : undefined,
      categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a course by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: CourseResponseDto })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<CourseResponseDto> {
    return this.coursesService.findOne(id);
  }

  @Get(':id/structure')
  @ApiOperation({ summary: 'Get the full nested structure of a course' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: CourseStructureResponseDto })
  getStructure(@Param('id', ParseIntPipe) id: number): Promise<CourseStructureResponseDto> {
    return this.coursesService.getStructure(id);
  }

  @Put(':id/structure')
  @ApiOperation({ summary: 'Save full course structure (transactional)' })
  @ApiParam({ name: 'id', type: Number })
  async saveStructure(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CourseStructureSaveDto,
  ): Promise<CourseStructureResponseDto> {
    return this.coursesService.saveStructure(id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a course by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: CourseResponseDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCourseDto: UpdateCourseDto,
  ): Promise<CourseResponseDto> {
    return this.coursesService.update(id, updateCourseDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a course by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiNoContentResponse({ description: 'Course deleted successfully' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.coursesService.remove(id);
  }
}
