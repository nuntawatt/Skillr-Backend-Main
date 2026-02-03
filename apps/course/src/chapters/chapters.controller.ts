import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
  ApiQuery,
  ApiNoContentResponse,
  ApiResponse,
} from '@nestjs/swagger';
import { ChaptersService } from './chapters.service';
import { CreateChapterDto, UpdateChapterDto, ChapterResponseDto } from './dto';

@ApiTags('Chapters')
@Controller('chapters')
export class ChaptersController {
  constructor(private readonly chaptersService: ChaptersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new chapter' })
  @ApiCreatedResponse({
    type: ChapterResponseDto,
    description: 'Chapter created successfully',
  })
  create(@Body() dto: CreateChapterDto): Promise<ChapterResponseDto> {
    return this.chaptersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all chapters for a level' })
  @ApiQuery({
    name: 'level_id',
    type: Number,
    required: true,
    description: 'ID of the level to fetch chapters for',
  })
  @ApiOkResponse({ type: ChapterResponseDto, isArray: true })
  findByLevel(
    @Query('level_id', ParseIntPipe) levelId: number,
  ): Promise<ChapterResponseDto[]> {
    return this.chaptersService.findByLevel(levelId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a chapter by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: ChapterResponseDto })
  @ApiResponse({ status: 404, description: 'Chapter not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ChapterResponseDto> {
    return this.chaptersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a chapter by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: ChapterResponseDto })
  @ApiResponse({ status: 404, description: 'Chapter not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateChapterDto: UpdateChapterDto,
  ): Promise<ChapterResponseDto> {
    return this.chaptersService.update(id, updateChapterDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a chapter by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiNoContentResponse({ description: 'Chapter deleted successfully' })
  @ApiResponse({ status: 404, description: 'Chapter not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.chaptersService.remove(id);
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reorder chapters within a level - เผื่อได้ใช้' })
  @ApiOkResponse({ type: ChapterResponseDto, isArray: true })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  reorder(
    @Body() body: { level_id: number; chapter_ids: number[] },
  ): Promise<ChapterResponseDto[]> {
    return this.chaptersService.reorder(body.level_id, body.chapter_ids);
  }
}
