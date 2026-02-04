import { BadRequestException, Controller, Get, Post, Param, Request, UseGuards, Body, Put, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiHeader } from '@nestjs/swagger';
import { LearningProgressService } from './learning-progress.service';
import { ChapterProgressService } from './chapter-progress.service';
import { LearningDashboardService } from './learning-dashboard.service';
import { LearningDashboardDto, LessonProgressResponseDto, ProgressSummaryDto, ChapterRoadmapDto, CompleteItemRequestDto, ChapterProgressDto, ItemProgressDto } from './dto/learning-progress.dto';
import { JwtAuthGuard } from '@auth';
import type { AuthUser } from '@auth';

function getUserIdOrThrow(user?: AuthUser, req?: any): string {
    const raw = user?.id ?? user?.sub ?? req?.headers?.['x-user-id'] ?? req?.headers?.['X-User-Id'];
    
    // For testing purposes - if no x-user-id provided, use default test user
    if (!raw) {
        return '550e8400-e29b-41d4-a716-446655440000';
    }
    
    if (typeof raw === 'string' || typeof raw === 'number') {
        return String(raw);
    }
    throw new BadRequestException(
        'Missing user id. Provide x-user-id header (UUID) or enable JwtAuthGuard.',
    );
}

@ApiTags('Learning Progress')
@ApiBearerAuth()
@Controller('learning')
// @UseGuards(JwtAuthGuard) // Comment for testing
export class LearningProgressController {
    constructor(
        private readonly learningProgressService: LearningProgressService,
        private readonly chapterProgressService: ChapterProgressService,
        private readonly learningDashboardService: LearningDashboardService,
    ) { }

    @Get('dashboard')
    @ApiOperation({ summary: 'Get learning dashboard' })
    @ApiResponse({
        status: 200,
        description: 'Dashboard รวม progress + สถิติการทำ quiz',
        type: LearningDashboardDto,
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid input data.',
    })
    @ApiResponse({
        status: 500,
        description: 'Internal Server Error.',
    })
    getDashboard(@Request() req: any) {
        return this.learningDashboardService.getDashboard(
            getUserIdOrThrow(req.user, req),
        );
    }

    @Post('lessons/:id/complete')
    @ApiOperation({ summary: 'Mark lesson as completed' })
    @ApiParam({ name: 'id', example: 1 })
    @ApiResponse({
        status: 201,
        description: 'User registered successfully.',
        type: LessonProgressResponseDto,
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid input data.',
    })
    @ApiResponse({
        status: 500,
        description: 'Internal Server Error.',
    })
    completeLesson(@Param('id') id: string, @Request() req: any) {
        return this.learningProgressService.completeLesson(
            getUserIdOrThrow(req.user, req),
            id,
        );
    }

    @Get('progress')
    @ApiOperation({ summary: 'Get progress summary' })
    @ApiResponse({
        status: 200,
        description: 'สรุป progress ของ user',
        type: ProgressSummaryDto,
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid input data.',
    })
    @ApiResponse({
        status: 500,
        description: 'Internal Server Error.',
    })
    getProgressSummary(@Request() req: any) {
        return this.learningProgressService.getSummary(getUserIdOrThrow(req.user, req));
    }

    @Get('lessons/:id/progress')
    @ApiOperation({ summary: 'Get progress for a specific lesson' })
    @ApiParam({ name: 'id', example: 1 })
    @ApiResponse({
        status: 200,
        description: 'สถานะ progress ของ lesson นี้',
        type: LessonProgressResponseDto,
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid input data.',
    })
    @ApiResponse({
        status: 500,
        description: 'Internal Server Error.',
    })
    getLessonProgress(@Param('id') id: string, @Request() req: any) {
        return this.learningProgressService.getLessonProgress(
            getUserIdOrThrow(req.user, req),
            id,
        );
    }

    @Get('chapters/:id/roadmap')
    @ApiOperation({ summary: 'Get chapter roadmap with progress' })
    @ApiParam({ name: 'id', example: 1 })
    @ApiHeader({ name: 'x-user-id', description: 'User UUID', required: true, example: '550e8400-e29b-41d4-a716-446655440000' })
    @ApiResponse({
        status: 200,
        description: 'Chapter roadmap with items and progress',
        type: ChapterRoadmapDto,
    })
    getChapterRoadmap(@Param('id') id: string, @Request() req: any) {
        return this.chapterProgressService.getChapterRoadmap(
            getUserIdOrThrow(req.user, req),
            Number(id),
        );
    }

    @Post('items/:id/start')
    @ApiOperation({ summary: 'Start learning an item' })
    @ApiParam({ name: 'id', example: 7 })
    @ApiResponse({
        status: 200,
        description: 'Item started successfully',
        type: ItemProgressDto,
    })
    startItem(@Param('id') id: string, @Request() req: any) {
        return this.chapterProgressService.startItem(
            getUserIdOrThrow(req.user, req),
            Number(id),
        );
    }

    @Post('items/:id/complete')
    @ApiOperation({ summary: 'Mark item as completed' })
    @ApiParam({ name: 'id', example: 7 })
    @ApiResponse({
        status: 200,
        description: 'Item completed successfully',
        type: ChapterProgressDto,
    })
    completeItem(
        @Param('id') id: string,
        @Body() completeItemDto: CompleteItemRequestDto,
        @Request() req: any
    ) {
        return this.chapterProgressService.completeItem(
            getUserIdOrThrow(req.user, req),
            Number(id),
            completeItemDto.timeSpentSeconds,
            completeItemDto.quizSkipped,
        );
    }

    @Post('items/:id/skip-quiz')
    @ApiOperation({ summary: 'Skip quiz and mark as completed' })
    @ApiParam({ name: 'id', example: 7 })
    @ApiResponse({
        status: 200,
        description: 'Quiz skipped and item completed',
        type: ChapterProgressDto,
    })
    skipQuiz(@Param('id') id: string, @Request() req: any) {
        return this.chapterProgressService.skipQuiz(
            getUserIdOrThrow(req.user, req),
            Number(id),
        );
    }

    @Get('chapters/:id/progress')
    @ApiOperation({ summary: 'Get chapter progress summary' })
    @ApiParam({ name: 'id', example: 1 })
    @ApiResponse({
        status: 200,
        description: 'Chapter progress summary',
        type: ChapterProgressDto,
    })
    getChapterProgress(@Param('id') id: string, @Request() req: any) {
        return this.chapterProgressService.getChapterProgress(
            getUserIdOrThrow(req.user, req),
            Number(id),
        );
    }

    @Get('chapters/progress')
    @ApiOperation({ summary: 'Get all chapters progress' })
    @ApiResponse({
        status: 200,
        description: 'All chapters progress',
        type: [ChapterProgressDto],
    })
    getAllChaptersProgress(@Request() req: any) {
        return this.chapterProgressService.getAllChaptersProgress(
            getUserIdOrThrow(req.user, req),
        );
    }
}
