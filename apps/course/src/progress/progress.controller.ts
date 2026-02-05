import { Body, Controller, Get, Param, ParseIntPipe, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth';
import { CurrentUserId } from './decorators/current-user-id.decorator';
import { CourseProgressSummaryDto } from './dto/course-progress-summary.dto';
import { LessonProgressResponseDto } from './dto/lesson-progress-response.dto';
import { UpsertLessonProgressDto } from './dto/upsert-lesson-progress.dto';
import { ChapterProgressDto } from './dto/chapter-progress.dto';
import { ChapterRoadmapDto } from './dto/chapter-roadmap.dto';
import { ProgressService } from './progress.service';

@ApiTags('Progress')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard) // Temporarily disabled for testing
@Controller('progress')
export class ProgressController {
    constructor(private readonly progressService: ProgressService) { }

    @Get('lessons/:lessonId')
    @ApiOperation({ summary: 'Get current user progress for a lesson' })
    @ApiParam({ name: 'lessonId', type: Number })
    @ApiOkResponse({ type: LessonProgressResponseDto, description: 'Lesson progress (or null if not started)' })
    getLessonProgress(
        @CurrentUserId() userId: string,
        @Param('lessonId', ParseIntPipe) lessonId: number,
    ): Promise<LessonProgressResponseDto | null> {
        return this.progressService.getLessonProgress(userId, lessonId);
    }

    @Put('lessons/:lessonId')
    @ApiOperation({ summary: 'Upsert current user progress + checkpoint for a lesson' })
    @ApiParam({ name: 'lessonId', type: Number })
    @ApiOkResponse({ type: LessonProgressResponseDto })
    upsertLessonProgress(
        @CurrentUserId() userId: string,
        @Param('lessonId', ParseIntPipe) lessonId: number,
        @Body() dto: UpsertLessonProgressDto,
    ): Promise<LessonProgressResponseDto> {
        return this.progressService.upsertLessonProgress(userId, lessonId, dto);
    }

    @Get('chapters/:chapterId')
    @ApiOperation({ summary: 'Get current user progress for a chapter' })
    @ApiParam({ name: 'chapterId', type: Number })
    @ApiOkResponse({ type: ChapterProgressDto })
    getChapterProgress(
        @CurrentUserId() userId: string,
        @Param('chapterId', ParseIntPipe) chapterId: number,
    ): Promise<ChapterProgressDto> {
        return this.progressService.getChapterProgress(userId, chapterId);
    }

    @Get('chapters/:chapterId/roadmap')
    @ApiOperation({ summary: 'Get chapter roadmap with item states (Completed/Current/Locked)' })
    @ApiParam({ name: 'chapterId', type: Number, example: 1 })
    @ApiOkResponse({ type: ChapterRoadmapDto })
    getChapterRoadmap(
        @CurrentUserId() userId: string,
        @Param('chapterId', ParseIntPipe) chapterId: number
    ): Promise<ChapterRoadmapDto> {
        return this.progressService.getChapterRoadmap(userId, chapterId);
    }
}
