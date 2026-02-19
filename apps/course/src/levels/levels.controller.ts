import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiParam, ApiQuery, ApiNoContentResponse, ApiResponse } from '@nestjs/swagger';
import { LevelsService } from './levels.service';
import { CreateLevelDto, UpdateLevelDto, LevelResponseDto, ReorderLevelsDto } from './dto';
import { JwtAuthGuard, RolesGuard, Roles } from '@auth';
import { UserRole } from '@common/enums/user-role.enum';

@ApiTags('Levels')
// @ApiTags('Admin | Levels')
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles(UserRole.ADMIN)
@Controller('levels')
export class LevelsController {
    constructor(private readonly levelsService: LevelsService) { }

    @Post()
    @ApiOperation({ summary: 'สร้างระดับใหม่' })
    @ApiCreatedResponse({ type: LevelResponseDto, description: 'Level created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    create(@Body() dto: CreateLevelDto): Promise<LevelResponseDto> {
        return this.levelsService.create(dto);
    }


    // @ApiTags('Student | Levels')
    // @UseGuards(JwtAuthGuard)
    @Get()
    @ApiOperation({ summary: 'ดึงระดับทั้งหมดสำหรับคอร์ส' })
    @ApiQuery({ name: 'course_id', required: true, type: Number })
    @ApiOkResponse({ type: LevelResponseDto, isArray: true })
    @ApiResponse({ status: 400, description: 'Invalid course ID' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    findByCourse(@Query('course_id', ParseIntPipe) course_id: number,): Promise<LevelResponseDto[]> {
        return this.levelsService.findByCourse(course_id);
    }

    // @ApiTags('Student | Levels')
    // @UseGuards(JwtAuthGuard)
    @Get(':id')
    @ApiOperation({ summary: 'ดึงระดับตาม ID' })
    @ApiParam({ name: 'id', type: Number })
    @ApiOkResponse({ type: LevelResponseDto })
    @ApiResponse({ status: 404, description: 'Level not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    findOne(@Param('id', ParseIntPipe) id: number): Promise<LevelResponseDto> {
        return this.levelsService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'อัปเดตระดับตาม ID' })
    @ApiParam({ name: 'id', type: Number })
    @ApiOkResponse({ type: LevelResponseDto })
    @ApiResponse({ status: 404, description: 'Level not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    update(@Param('id', ParseIntPipe) id: number, @Body() updateLevelDto: UpdateLevelDto): Promise<LevelResponseDto> {
        return this.levelsService.update(id, updateLevelDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'ลบระดับตาม ID' })
    @ApiParam({ name: 'id', type: Number })
    @ApiNoContentResponse({ description: 'Level deleted successfully' })
    @ApiResponse({ status: 404, description: 'Level not found' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
        return this.levelsService.remove(id);
    }

    @Post('reorder')
    @ApiOperation({ summary: 'จัดลำดับระดับภายในคอร์ส' })
    @ApiOkResponse({ type: LevelResponseDto, isArray: true })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    reorder(@Body() body: ReorderLevelsDto): Promise<LevelResponseDto[]> {
        return this.levelsService.reorder(body.course_id, body.level_ids);
    }
}
