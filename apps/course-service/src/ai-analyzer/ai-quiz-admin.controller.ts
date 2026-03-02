import { Body, Controller, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Roles, RolesGuard } from '@auth';
import { UserRole } from '@common/enums';

import { AiQuizService } from './ai-quiz.service';
import { GenerateAiQuizDto } from './dto/generate-ai-quiz.dto';

@ApiTags('Admin | Ai Analyzer - Quiz')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/ai-quiz')
export class AiQuizAdminController {
  constructor(private readonly aiQuizService: AiQuizService) {}

  @Post(':lessonId/generate')
  @ApiOperation({ summary: 'Generate AI quiz from lesson content' })
  @ApiParam({ name: 'lessonId', type: Number })
  @ApiBody({ type: GenerateAiQuizDto, required: false })
  @ApiResponse({ status: 201, description: 'AI quiz generation created' })
  @ApiResponse({ status: 400, description: 'Invalid lesson ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  @ApiResponse({ status: 429, description: 'OpenAI quota exceeded' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  generateFromLesson(
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @Body() body?: GenerateAiQuizDto,
  ) {
    return this.aiQuizService.generateQuizFromLesson(lessonId, body);
  }

  @Post(':aiQuizId/approve')
  @ApiOperation({ summary: 'Approve AI quiz and save to quizs table' })
  @ApiParam({ name: 'aiQuizId', type: Number })
  @ApiResponse({ status: 201, description: 'Quiz saved and AI quiz marked approved' })
  @ApiResponse({ status: 400, description: 'Invalid AI quiz ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'AI quiz not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  approve(@Param('aiQuizId', ParseIntPipe) aiQuizId: number) {
    return this.aiQuizService.approveAiQuiz(aiQuizId);
  }
}