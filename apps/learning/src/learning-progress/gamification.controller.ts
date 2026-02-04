import { 
  Controller, 
  Get, 
  Post, 
  Param, 
  Body, 
  Query, 
  Request,
  UseGuards,
  BadRequestException,
  NotFoundException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiBody, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/src/auth/guards/jwt-auth.guard';
import { GamificationService } from './gamification.service';
import { LessonProgressStatus } from './entities/lesson-progress.entity';

@ApiTags('Gamification Progress')
@Controller('gamification')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('chapters/:chapterId/progress')
  @ApiOperation({ summary: 'Get chapter progress percentage and status' })
  @ApiParam({ name: 'chapterId', description: 'Chapter ID' })
  @ApiResponse({
    status: 200,
    description: 'Chapter progress retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        chapterId: { type: 'number' },
        progressPercentage: { type: 'number' },
        totalItems: { type: 'number' },
        completedItems: { type: 'number' },
        currentItem: { type: 'number', nullable: true },
        nextAvailableItem: { type: 'number', nullable: true },
        checkpointStatus: {
          type: 'object',
          properties: {
            isUnlocked: { type: 'boolean' },
            progress: { type: 'number' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid chapter ID or request failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  async getChapterProgress(
    @Param('chapterId') chapterId: string,
    @Request() req: any
  ) {
    try {
      const userId = req.user.userId;
      const chapterIdNum = Number(chapterId);
      
      if (isNaN(chapterIdNum)) {
        throw new BadRequestException('Invalid chapter ID');
      }

      return await this.gamificationService.getChapterGamificationProgress(userId, chapterIdNum);
    } catch (error) {
      throw new BadRequestException(`Failed to get chapter progress: ${error.message}`);
    }
  }

  @Get('chapters/:chapterId/roadmap')
  @ApiOperation({ summary: 'Get full chapter roadmap with item statuses' })
  @ApiParam({ name: 'chapterId', description: 'Chapter ID' })
  @ApiResponse({
    status: 200,
    description: 'Chapter roadmap retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        chapterProgress: {
          type: 'object',
          properties: {
            chapterId: { type: 'number' },
            progressPercentage: { type: 'number' },
            totalItems: { type: 'number' },
            completedItems: { type: 'number' }
          }
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              lessonId: { type: 'number' },
              status: { type: 'string', enum: ['completed', 'current', 'locked'] },
              progressPercentage: { type: 'number' },
              isAccessible: { type: 'boolean' },
              canSkip: { type: 'boolean' }
            }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid chapter ID or request failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  async getChapterRoadmap(
    @Param('chapterId') chapterId: string,
    @Request() req: any
  ) {
    try {
      const userId = req.user.userId;
      const chapterIdNum = Number(chapterId);
      
      if (isNaN(chapterIdNum)) {
        throw new BadRequestException('Invalid chapter ID');
      }

      return await this.gamificationService.getChapterRoadmap(userId, chapterIdNum);
    } catch (error) {
      throw new BadRequestException(`Failed to get chapter roadmap: ${error.message}`);
    }
  }

  @Post('lessons/:lessonId/complete')
  @ApiOperation({ summary: 'Mark lesson as completed' })
  @ApiParam({ name: 'lessonId', description: 'Lesson ID' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        chapterId: { type: 'number', description: 'Chapter ID' }
      },
      required: ['chapterId']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Lesson completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        chapterProgress: {
          type: 'object',
          properties: {
            chapterId: { type: 'number' },
            progressPercentage: { type: 'number' },
            totalItems: { type: 'number' },
            completedItems: { type: 'number' },
            currentItem: { type: 'number', nullable: true },
            nextAvailableItem: { type: 'number', nullable: true }
          }
        },
        validation: {
          type: 'object',
          properties: {
            isValid: { type: 'boolean' },
            errors: { type: 'array', items: { type: 'string' } },
            warnings: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid lesson ID, chapter ID, or request failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  async completeLesson(
    @Param('lessonId') lessonId: string,
    @Body() body: { chapterId: number },
    @Request() req: any
  ) {
    try {
      const userId = req.user.userId;
      const lessonIdNum = Number(lessonId);
      
      if (isNaN(lessonIdNum)) {
        throw new BadRequestException('Invalid lesson ID');
      }

      if (!body.chapterId) {
        throw new BadRequestException('chapterId is required');
      }

      return await this.gamificationService.completeLessonWithGamification(
        userId, 
        lessonIdNum, 
        body.chapterId
      );
    } catch (error) {
      throw new BadRequestException(`Failed to complete lesson: ${error.message}`);
    }
  }

  @Post('lessons/:lessonId/skip')
  @ApiOperation({ summary: 'Skip quiz (counts as progress)' })
  @ApiParam({ name: 'lessonId', description: 'Quiz Lesson ID' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        chapterId: { type: 'number', description: 'Chapter ID' }
      },
      required: ['chapterId']
    }
  })
  async skipQuiz(
    @Param('lessonId') lessonId: string,
    @Body() body: { chapterId: number },
    @Request() req: any
  ) {
    try {
      const userId = req.user.userId;
      const lessonIdNum = Number(lessonId);
      
      if (isNaN(lessonIdNum)) {
        throw new BadRequestException('Invalid lesson ID');
      }

      if (!body.chapterId) {
        throw new BadRequestException('chapterId is required');
      }

      return await this.gamificationService.skipQuizWithGamification(
        userId, 
        lessonIdNum, 
        body.chapterId
      );
    } catch (error) {
      throw new BadRequestException(`Failed to skip quiz: ${error.message}`);
    }
  }

  @Post('lessons/:lessonId/video-progress')
  @ApiOperation({ summary: 'Update video progress' })
  @ApiParam({ name: 'lessonId', description: 'Video Lesson ID' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        chapterId: { type: 'number', description: 'Chapter ID' },
        currentTime: { type: 'number', description: 'Current video time in seconds' },
        duration: { type: 'number', description: 'Total video duration in seconds' }
      },
      required: ['chapterId', 'currentTime', 'duration']
    }
  })
  async updateVideoProgress(
    @Param('lessonId') lessonId: string,
    @Body() body: { 
      chapterId: number;
      currentTime: number;
      duration: number;
    },
    @Request() req: any
  ) {
    try {
      const userId = req.user.userId;
      const lessonIdNum = Number(lessonId);
      
      if (isNaN(lessonIdNum)) {
        throw new BadRequestException('Invalid lesson ID');
      }

      if (!body.chapterId || !body.currentTime || !body.duration) {
        throw new BadRequestException('chapterId, currentTime, and duration are required');
      }

      if (body.currentTime < 0 || body.duration <= 0) {
        throw new BadRequestException('Invalid time values');
      }

      return await this.gamificationService.updateVideoProgressWithGamification(
        userId, 
        lessonIdNum, 
        body.chapterId,
        body.currentTime, 
        body.duration
      );
    } catch (error) {
      throw new BadRequestException(`Failed to update video progress: ${error.message}`);
    }
  }

  @Get('checkpoints/:checkpointId/status')
  @ApiOperation({ summary: 'Get checkpoint unlock status' })
  @ApiParam({ name: 'checkpointId', description: 'Checkpoint Lesson ID' })
  @ApiQuery({ 
    name: 'chapterId', 
    required: true, 
    description: 'Chapter ID',
    type: Number 
  })
  @ApiQuery({ 
    name: 'precedingLessonIds', 
    required: false, 
    description: 'Comma-separated preceding lesson IDs',
    type: String 
  })
  async getCheckpointStatus(
    @Param('checkpointId') checkpointId: string,
    @Query('chapterId') chapterId: string,
    @Request() req: any,
    @Query('precedingLessonIds') precedingLessonIds?: string
  ) {
    try {
      const userId = req.user.userId;
      const checkpointIdNum = Number(checkpointId);
      const chapterIdNum = Number(chapterId);
      
      if (isNaN(checkpointIdNum) || isNaN(chapterIdNum)) {
        throw new BadRequestException('Invalid checkpoint or chapter ID');
      }

      let precedingIds: number[] = [];
      if (precedingLessonIds) {
        precedingIds = precedingLessonIds.split(',')
          .map(id => {
            const num = Number(id.trim());
            if (isNaN(num)) {
              throw new BadRequestException(`Invalid preceding lesson ID: ${id}`);
            }
            return num;
          });
      }

      const checkpointProgress = await this.gamificationService.checkpointService
        .getCheckpointProgress(userId, precedingIds);

      const isUnlocked = await this.gamificationService.checkpointService
        .canAccessCheckpoint(userId, checkpointIdNum, precedingIds);

      return {
        checkpointId: checkpointIdNum,
        isUnlocked,
        progress: checkpointProgress,
        requiredItems: precedingIds.length,
        completedItems: checkpointProgress.completed
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get checkpoint status: ${error.message}`);
    }
  }

  @Get('chapters/:chapterId/validate')
  @ApiOperation({ summary: 'Validate chapter progress integrity' })
  @ApiParam({ name: 'chapterId', description: 'Chapter ID' })
  async validateChapterProgress(
    @Param('chapterId') chapterId: string,
    @Request() req: any
  ) {
    try {
      const userId = req.user.userId;
      const chapterIdNum = Number(chapterId);
      
      if (isNaN(chapterIdNum)) {
        throw new BadRequestException('Invalid chapter ID');
      }

      return await this.gamificationService.validateOverallProgress(userId, chapterIdNum);
    } catch (error) {
      throw new BadRequestException(`Failed to validate progress: ${error.message}`);
    }
  }

  @Post('chapters/:chapterId/reset')
  @ApiOperation({ summary: 'Reset chapter progress (Admin/Debug only)' })
  @ApiParam({ name: 'chapterId', description: 'Chapter ID' })
  async resetChapterProgress(
    @Param('chapterId') chapterId: string,
    @Request() req: any
  ) {
    try {
      const userId = req.user.userId;
      const chapterIdNum = Number(chapterId);
      
      if (isNaN(chapterIdNum)) {
        throw new BadRequestException('Invalid chapter ID');
      }

      await this.gamificationService.resetChapterProgress(userId, chapterIdNum);
      
      return {
        success: true,
        message: 'Chapter progress reset successfully',
        chapterId: chapterIdNum
      };
    } catch (error) {
      throw new BadRequestException(`Failed to reset progress: ${error.message}`);
    }
  }

  @Get('lessons/:lessonId/access')
  @ApiOperation({ summary: 'Check if user can access lesson' })
  @ApiParam({ name: 'lessonId', description: 'Lesson ID' })
  @ApiQuery({ 
    name: 'chapterId', 
    required: true, 
    description: 'Chapter ID',
    type: Number 
  })
  async checkLessonAccess(
    @Param('lessonId') lessonId: string,
    @Query('chapterId') chapterId: string,
    @Request() req: any
  ) {
    try {
      const userId = req.user.userId;
      const lessonIdNum = Number(lessonId);
      const chapterIdNum = Number(chapterId);
      
      if (isNaN(lessonIdNum) || isNaN(chapterIdNum)) {
        throw new BadRequestException('Invalid lesson or chapter ID');
      }

      const summary = await this.gamificationService.chapterProgressService
        .getChapterProgressSummary(userId, chapterIdNum);
      
      const lessonItem = summary.items.find(item => item.lessonId === lessonIdNum);
      
      if (!lessonItem) {
        throw new NotFoundException('Lesson not found in chapter');
      }

      return {
        lessonId: lessonIdNum,
        canAccess: lessonItem.status !== LessonProgressStatus.LOCKED,
        status: lessonItem.status,
        progressPercentage: lessonItem.progressPercentage
      };
    } catch (error) {
      throw new BadRequestException(`Failed to check lesson access: ${error.message}`);
    }
  }
}
