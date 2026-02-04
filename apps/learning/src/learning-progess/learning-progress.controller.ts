import { BadRequestException, Controller, Get, Post, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { LearningProgressService } from './learning-progress.service';
import { LearningDashboardService } from './learning-dashboard.service';
import { LearningDashboardDto, LessonProgressResponseDto, ProgressSummaryDto } from './dto/learning-progress.dto';
import { JwtAuthGuard } from '@auth';
import type { AuthUser } from '@auth';

function getUserIdOrThrow(user?: AuthUser, req?: any): string {
    const raw = user?.id ?? user?.sub ?? req?.headers?.['x-user-id'];
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
// @UseGuards(JwtAuthGuard)
export class LearningProgressController {
    constructor(
        private readonly learningProgressService: LearningProgressService,
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
}
