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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { QuizService } from './quiz.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { CreateQuizsDto, CreateCheckpointDto } from './dto/create-quizs.dto';
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
}

@ApiTags('Admin | Quiz')
@ApiBearerAuth()
@Controller('admin/quizzes')
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
export class QuizAdminController {
  constructor(private readonly quizService: QuizService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new quiz (1 Lesson = 1 Question)' })
  @ApiBody({
    type: CreateQuizsDto,
    examples: {
      multiple_choice: {
        summary: 'ตัวอย่าง: Quiz แบบเลือกตอบ (MC)',
        value: {
          lesson_id: 1,
          quizs_type: 'multiple_choice',
          quizs_questions: 'TypeScript คืออะไร?',
          quizs_option: ['Superset ของ JavaScript', 'ชื่อกาแฟ', 'ระบบปฏิบัติการ'],
          quizs_answer: 'Superset ของ JavaScript',
        },
      },
      true_false: {
        summary: 'ตัวอย่าง: Quiz แบบถูก/ผิด (TF)',
        value: {
          lesson_id: 2,
          quizs_type: 'true_false',
          quizs_questions: 'Node.js คือภาษาโปรแกรมใช่หรือไม่?',
          quizs_option: ['True', 'False'],
          quizs_answer: 'False',
        },
      },
    },
  })
  createQuiz(@Body() dto: CreateQuizsDto) {
    return this.quizService.createQuizs(dto);
  }

  @Post('checkpoint')
  @ApiOperation({ summary: 'Create a new checkpoint' })
  @ApiBody({
    type: CreateCheckpointDto,
    examples: {
      checkpoint_example: {
        summary: 'ตัวอย่าง: Checkpoint ระหว่างเรียน',
        value: {
          lesson_id: 1,
          checkpoint_type: 'multiple_choice',
          checkpoint_questions: '1 + 1 เท่ากับเท่าไหร่?',
          checkpoint_option: ['1', '2', '3'],
          checkpoint_answer: '2',
        },
      },
    },
  })
  createCheckpoint(@Body() dto: CreateCheckpointDto) {
    return this.quizService.createCheckpoint(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update quiz' })
  @ApiBody({
    type: UpdateQuizDto,
    examples: {
      update_title: {
        summary: 'Update quiz title',
        value: { title: 'แบบทดสอบ TypeScript ขั้นสูง' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz updated successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz not found',
  })
  updateQuiz(@Param('id') id: string, @Body() updateQuizDto: UpdateQuizDto) {
    return this.quizService.updateQuiz(id, updateQuizDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete quiz' })
  removeQuiz(@Param('id') id: string) {
    return this.quizService.removeQuiz(id);
  }
}

@ApiTags('Admin | Question')
@ApiBearerAuth()
@Controller('admin/questions')
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
export class QuestionAdminController {
  constructor(private readonly quizService: QuizService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Update question' })
  @ApiBody({
    type: UpdateQuestionDto,
    examples: {
      update_mc: {
        summary: 'Update Multiple Choice question',
        value: {
          question: 'ข้อใดคือหน่วยประมวลผลกลาง?',
          type: 'multiple_choice',
          options: ['RAM', 'CPU', 'GPU', 'SSD'],
          correctAnswer: 'CPU',
          explanation: 'CPU ย่อมาจาก Central Processing Unit',
        },
      },
      update_tf: {
        summary: 'Update True/False question',
        value: {
          question: 'โลกหมุนรอบตัวเองใช่หรือไม่?',
          type: 'true_false',
          correctAnswerBool: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Question updated successfully.',
  })
  updateQuestion(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.quizService.updateQuestion(Number(id), updateQuestionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete question' })
  removeQuestion(@Param('id') id: string) {
    return this.quizService.removeQuestion(Number(id));
  }
}

@ApiTags('Student | Quiz')
@ApiBearerAuth()
@Controller('quizzes')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Get()
  @ApiOperation({ summary: 'Get all quizzes' })
  findAllQuizzes(@Request() req: RequestWithUser) {
    const quizzesPromise = this.quizService.findAllQuizzes();
    return quizzesPromise.then(async (list) => {
      const user = req.user;
      const isAdminOrInstructor =
        user?.role === UserRole.ADMIN || user?.role === UserRole.INSTRUCTOR;
      const userId = getUserIdOrThrow(user);

      if (!isAdminOrInstructor) {
        return Promise.all(
          list.map((q) => this.quizService.stripAnswers(q, userId)),
        );
      }
      return list;
    });
  }

  @Get('lesson/:lessonId')
  @ApiOperation({ summary: 'Get quiz by lesson id (New 1-to-1)' })
  findOneQuizByLesson(@Param('lessonId') lessonId: string) {
    return this.quizService.findOneQuizsByLesson(Number(lessonId));
  }

  @Get('checkpoint/:lessonId')
  @ApiOperation({ summary: 'Get checkpoints by lesson id' })
  findCheckpointsByLesson(@Param('lessonId') lessonId: string) {
    return this.quizService.findCheckpointsByLesson(Number(lessonId));
  }

  @Post('lesson/:lessonId/check')
  @ApiOperation({ summary: 'Check answer for quiz by lesson id (New 1-to-1)' })
  checkQuizs(@Param('lessonId') lessonId: string, @Body('answer') answer: any) {
    return this.quizService.checkQuizsAnswer(Number(lessonId), answer);
  }

  @Post('checkpoint/:id/check')
  @ApiOperation({ summary: 'Check answer for checkpoint by id' })
  checkCheckpoint(@Param('id') id: string, @Body('answer') answer: any) {
    return this.quizService.checkCheckpointAnswer(Number(id), answer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quiz by id' })
  findOneQuiz(@Param('id') id: string, @Request() req: RequestWithUser) {
    const quizPromise = this.quizService.findOneQuiz(id);

    return quizPromise.then(async (quiz) => {
      const user = req.user;
      const isAdminOrInstructor =
        user?.role === UserRole.ADMIN || user?.role === UserRole.INSTRUCTOR;
      const userId = getUserIdOrThrow(user);

      if (isAdminOrInstructor) return quiz;

      // Student: never expose correct answers via this endpoint.
      // Review results should be fetched via /quizzes/:id/solution.
      return this.quizService.stripAnswers(quiz, userId);
    });
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start a quiz attempt (or continue existing one)' })
  @ApiQuery({ name: 'retry', required: false })
  startQuiz(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Query('retry') retry?: string,
  ) {
    return this.quizService.startQuiz(id, getUserIdOrThrow(req.user), {
      retry: ['true', '1'].includes(retry?.trim().toLowerCase() || ''),
    });
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete or skip a quiz' })
  completeQuiz(
    @Param('id') id: string,
    @Body('status') status: 'COMPLETED' | 'SKIPPED',
    @Request() req: RequestWithUser,
  ) {
    return this.quizService.completeQuiz(id, getUserIdOrThrow(req.user), status);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit quiz answers and get final result' })
  submitQuiz(
    @Param('id') id: string,
    @Body() submitDto: SubmitQuizDto,
    @Request() req: RequestWithUser,
  ) {
    return this.quizService.submitQuiz(id, getUserIdOrThrow(req.user), submitDto);
  }

  @Post('questions/:id/check')
  @ApiOperation({ summary: 'Check answer for a single question' })
  @ApiParam({ name: 'id', example: 10, description: 'Question ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        answer: {
          oneOf: [
            { type: 'string', example: 'Superset ของ JavaScript' },
            { type: 'boolean', example: true },
          ],
        },
      },
    },
    examples: {
      check_mc: {
        summary: 'Check Multiple Choice answer',
        value: {
          answer: 'Superset ของ JavaScript',
        },
      },
      check_tf: {
        summary: 'Check True/False answer',
        value: {
          answer: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'ผลการตรวจคำถาม',
    schema: {
      example: {
        isCorrect: true,
        correctAnswer: 'Superset ของ JavaScript',
        explanation: 'TypeScript เป็นภาษาที่สร้างครอบ JavaScript อีกทีหนึ่ง',
        isCompleted: false,
      },
    },
  })
  checkQuestion(
    @Param('id') questionId: string,
    @Body('answer') answer: any,
    @Request() req: RequestWithUser,
  ) {
    return this.quizService.checkAnswer(getUserIdOrThrow(req.user), {
      questionId: Number(questionId),
      answer,
    });
  }

  @Get(':id/solution')
  @ApiOperation({ summary: 'Get my quiz solution (answers + correct/incorrect) for a completed quiz' })
  getMyQuizSolution(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.quizService.getQuizSolution(id, getUserIdOrThrow(req.user));
  }

  @Get(':id/attempts')
  @ApiOperation({ summary: 'Get my attempts for a quiz' })
  getMyAttempts(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.quizService.getAttempts(id, getUserIdOrThrow(req.user));
  }
}

@ApiTags('Internal')
@Controller('users')
export class InternalController {
  constructor(private readonly quizService: QuizService) {}

  @Get(':userId/stats')
  @ApiOperation({ summary: 'Get quiz stats for a user (Internal)' })
  getUserStats(@Param('userId') userId: string) {
    return this.quizService.getUserAttemptStats(userId);
  }
}
