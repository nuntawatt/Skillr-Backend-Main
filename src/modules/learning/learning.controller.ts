import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { LearningService } from './learning.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@Controller('learning')
@UseGuards(JwtAuthGuard)
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  // Quiz CRUD
  @Post('quizzes')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
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
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  updateQuiz(@Param('id') id: string, @Body() updateQuizDto: UpdateQuizDto) {
    return this.learningService.updateQuiz(id, updateQuizDto);
  }

  @Delete('quizzes/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  removeQuiz(@Param('id') id: string) {
    return this.learningService.removeQuiz(id);
  }

  // Quiz attempts
  @Post('quizzes/:id/start')
  startQuiz(@Param('id') id: string, @Request() req) {
    return this.learningService.startQuiz(id, req.user.id);
  }

  @Post('quizzes/:id/submit')
  submitQuiz(
    @Param('id') id: string,
    @Body() submitDto: SubmitQuizDto,
    @Request() req,
  ) {
    return this.learningService.submitQuiz(id, req.user.id, submitDto);
  }

  @Get('quizzes/:id/attempts')
  getMyAttempts(@Param('id') id: string, @Request() req) {
    return this.learningService.getAttempts(id, req.user.id);
  }
}
