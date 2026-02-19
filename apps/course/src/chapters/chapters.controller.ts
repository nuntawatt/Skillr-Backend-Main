import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiParam, ApiQuery, ApiNoContentResponse, ApiResponse } from '@nestjs/swagger';
import { ChaptersService } from './chapters.service';
import { CreateChapterDto, UpdateChapterDto, ChapterResponseDto, ReorderChaptersDto } from './dto';
import { JwtAuthGuard, RolesGuard, Roles } from '@auth';
import { UserRole } from '@common/enums/user-role.enum';

@ApiTags('Admin | Chapters')
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles(UserRole.ADMIN)
@Controller('chapters')
export class ChaptersController {
    constructor(private readonly chaptersService: ChaptersService) { }

    @Post()
    @ApiOperation({ summary: 'สร้างบทใหม่' })
    @ApiCreatedResponse({ type: ChapterResponseDto, description: 'Chapter created successfully' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    create(@Body() dto: CreateChapterDto): Promise<ChapterResponseDto> {
        return this.chaptersService.create(dto);
    }

    // @ApiTags('Student | Chapters')
    // @UseGuards(JwtAuthGuard)
    @Get()
    @ApiOperation({ summary: 'ดึงบททั้งหมดสำหรับระดับ' })
    @ApiQuery({ name: 'level_id', type: Number, required: true, description: 'ID of the level to fetch chapters for' })
    @ApiOkResponse({ type: ChapterResponseDto, isArray: true })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    findByLevel(@Query('level_id', ParseIntPipe) levelId: number): Promise<ChapterResponseDto[]> {
        return this.chaptersService.findByLevel(levelId);
    }

    // @ApiTags('Student | Chapters')
    // @UseGuards(JwtAuthGuard)
    @Get(':id')
    @ApiOperation({ summary: 'ดึงบทตาม ID' })
    @ApiParam({ name: 'id', type: Number })
    @ApiOkResponse({ type: ChapterResponseDto })
    @ApiResponse({ status: 404, description: 'Chapter not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    findOne(@Param('id', ParseIntPipe) id: number): Promise<ChapterResponseDto> {
        return this.chaptersService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'อัปเดตบทตาม ID' })
    @ApiParam({ name: 'id', type: Number })
    @ApiOkResponse({ type: ChapterResponseDto })
    @ApiResponse({ status: 404, description: 'Chapter not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    update(@Param('id', ParseIntPipe) id: number, @Body() updateChapterDto: UpdateChapterDto): Promise<ChapterResponseDto> {
        return this.chaptersService.update(id, updateChapterDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'ลบบทตาม ID' })
    @ApiParam({ name: 'id', type: Number })
    @ApiNoContentResponse({ description: 'Chapter deleted successfully' })
    @ApiResponse({ status: 404, description: 'Chapter not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
        return this.chaptersService.remove(id);
    }

    @Post('reorder')
    @ApiOperation({ summary: 'จัดลำดับบทภายในระดับ' })
    @ApiOkResponse({ type: ChapterResponseDto, isArray: true })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    reorder(@Body() body: ReorderChaptersDto): Promise<ChapterResponseDto[]> {
        return this.chaptersService.reorder(body.level_id, body.chapter_ids);
    }
}