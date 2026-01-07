import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { LearningService } from './learning.service';
import { LearningDashboardService } from './learning-dashboard.service';
import { LearningProgressService } from './learning-progress.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { JwtAuthGuard, RolesGuard, Roles } from '@auth';
import type { AuthUser } from '@auth';
import { UserRole } from '@common/enums';

type RequestWithUser = {
  user?: AuthUser;
};

function getUserIdOrThrow(user?: AuthUser): string {
  const raw = user?.id ?? user?.sub;
  if (typeof raw === 'string' || typeof raw === 'number') {
    return String(raw);
  }
  // For testing without Auth: return a dummy ID instead of throwing
  return '1';
  // throw new UnauthorizedException();
}

@Controller('learning')
// @UseGuards(JwtAuthGuard)
export class LearningController {
  constructor(
    private readonly learningService: LearningService,
    private readonly learningProgressService: LearningProgressService,
    private readonly learningDashboardService: LearningDashboardService,
  ) {}

  // Quiz CRUD
  @Post('quizzes')
  // @UseGuards(RolesGuard)
  // @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  createQuiz(@Body() createQuizDto: CreateQuizDto) {
    return this.learningService.createQuiz(createQuizDto);
  }

  @Get('quizzes')
  findAllQuizzes(@Query('lessonId') lessonId?: string) {
    return this.learningService.findAllQuizzes(lessonId);
  }

  @Get('quizzes/:id')
  findOneQuiz(@Param('id') id: string) {
    return this.learningService.findOneQuiz(id);
  }

  @Patch('quizzes/:id')
  // @UseGuards(RolesGuard)
  // @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  updateQuiz(@Param('id') id: string, @Body() updateQuizDto: UpdateQuizDto) {
    return this.learningService.updateQuiz(id, updateQuizDto);
  }

  @Delete('quizzes/:id')
  // @UseGuards(RolesGuard)
  // @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  removeQuiz(@Param('id') id: string) {
    return this.learningService.removeQuiz(id);
  }

  @Delete('questions/:id')
  // @UseGuards(RolesGuard)
  // @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  removeQuestion(@Param('id') id: string) {
    return this.learningService.removeQuestion(Number(id));
  }

  @Patch('questions/:id')
  // @UseGuards(RolesGuard)
  // @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  updateQuestion(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.learningService.updateQuestion(Number(id), updateQuestionDto);
  }

  // Quiz attempts
  @Post('quizzes/:id/start')
  startQuiz(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.learningService.startQuiz(id, getUserIdOrThrow(req.user));
  }

  @Post('quizzes/:id/submit')
  submitQuiz(
    @Param('id') id: string,
    @Body() submitDto: SubmitQuizDto,
    @Request() req: RequestWithUser,
  ) {
    return this.learningService.submitQuiz(
      id,
      getUserIdOrThrow(req.user),
      submitDto,
    );
  }

  @Get('quizzes/:id/attempts')
  getMyAttempts(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.learningService.getAttempts(id, getUserIdOrThrow(req.user));
  }

  @Post('lessons/:id/complete')
  completeLesson(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.learningProgressService.completeLesson(
      getUserIdOrThrow(req.user),
      id,
    );
  }

  @Get('progress')
  getProgressSummary(@Request() req: RequestWithUser) {
    return this.learningProgressService.getSummary(getUserIdOrThrow(req.user));
  }

  @Get('lessons/:id/progress')
  getLessonProgress(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.learningProgressService.getLessonProgress(
      getUserIdOrThrow(req.user),
      id,
    );
  }

  @Get('dashboard')
  getDashboard(@Request() req: RequestWithUser) {
    return this.learningDashboardService.getDashboard(
      getUserIdOrThrow(req.user),
    );
  }
}
