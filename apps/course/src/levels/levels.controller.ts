import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiParam, ApiQuery, ApiNoContentResponse, ApiResponse } from '@nestjs/swagger';
import { LevelsService } from './levels.service';
import { CreateLevelDto, UpdateLevelDto, LevelResponseDto } from './dto';

@ApiTags('Levels')
@Controller('levels')
export class LevelsController {
    constructor(private readonly levelsService: LevelsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new level' })
    @ApiCreatedResponse({ type: LevelResponseDto, description: 'Level created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    create(@Body() dto: CreateLevelDto): Promise<LevelResponseDto> {
        return this.levelsService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all levels' })
    @ApiOkResponse({ type: LevelResponseDto, isArray: true })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    findAll(): Promise<LevelResponseDto[]> {
        return this.levelsService.findAll();
    }


    @Get(':id')
    @ApiOperation({ summary: 'Get a level by ID' })
    @ApiParam({ name: 'id', type: Number })
    @ApiOkResponse({ type: LevelResponseDto })
    @ApiResponse({ status: 404, description: 'Level not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    findOne(@Param('id', ParseIntPipe) id: number): Promise<LevelResponseDto> {
        return this.levelsService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a level by ID' })
    @ApiParam({ name: 'id', type: Number })
    @ApiOkResponse({ type: LevelResponseDto })
    @ApiResponse({ status: 404, description: 'Level not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    update(@Param('id', ParseIntPipe) id: number, @Body() updateLevelDto: UpdateLevelDto): Promise<LevelResponseDto> {
        return this.levelsService.update(id, updateLevelDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a level by ID' })
    @ApiParam({ name: 'id', type: Number })
    @ApiNoContentResponse({ description: 'Level deleted successfully' })
    @ApiResponse({ status: 404, description: 'Level not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
        return this.levelsService.remove(id);
    }

    @Post('reorder')
    @ApiOperation({ summary: 'Reorder levels within a course - เผื่อได้ใช้' })
    @ApiOkResponse({ type: LevelResponseDto, isArray: true })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    reorder(@Body() body: { course_id: number; level_ids: number[] }): Promise<LevelResponseDto[]> {
        return this.levelsService.reorder(body.course_id, body.level_ids);
    }
}
