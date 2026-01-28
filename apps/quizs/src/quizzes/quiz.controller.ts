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
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
export class QuizAdminController {
  constructor(private readonly quizService: QuizService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new quiz with questions' })
  @ApiBody({
    type: CreateQuizDto,
    examples: {
      multiple_choice_example: {
        summary: 'ตัวอย่าง: Quiz แบบเลือกตอบ (Multiple Choice)',
        value: {
          lessonId: 1,
          title: 'แบบทดสอบ TypeScript (Multiple Choice)',
          questions: [
            {
              question: 'TypeScript คืออะไร?',
              type: 'multiple_choice',
              options: [
                'Superset ของ JavaScript',
                'ชื่อตัวละครในเกม',
                'ยี่ห้อกาแฟ',
                'ระบบปฏิบัติการ',
              ],
              correctAnswer: 'Superset ของ JavaScript',
              explanation: 'TypeScript เป็นภาษาที่สร้างครอบ JavaScript อีกทีหนึ่ง เพื่อเพิ่มความสามารถด้าน Static Typing',
              mediaUrl: 'https://example.com/ts-logo.png',
            },
          ],
        },
      },
      true_false_example: {
        summary: 'ตัวอย่าง: Quiz แบบถูก/ผิด (True/False)',
        value: {
          lessonId: 2,
          title: 'แบบทดสอบความเข้าใจพื้นฐาน (True/False)',
          questions: [
            {
              question: 'Browser สามารถรันไฟล์ .ts ได้โดยตรงใช่หรือไม่?',
              type: 'true_false',
              correctAnswerBool: false,
              explanation: 'ไม่ถูกต้อง เพราะ Browser รันได้เฉพาะ JavaScript เท่านั้น ต้องผ่านการ Compile ก่อน',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Quiz created successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data.',
    schema: {
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: '1 Lesson สามารถมีคำถามรวมได้สูงสุด 3 ข้อ (ปัจจุบันมีแล้ว 3 ข้อ)',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  createQuiz(@Body() createQuizDto: CreateQuizDto) {
    return this.quizService.createQuiz(createQuizDto);
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
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
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

      if (userId) {
        const activeAttempt = await this.quizService.getActiveAttempt(quiz.id, userId);
        if (activeAttempt) return this.quizService.stripAnswers(quiz, userId);

        const hasCompleted = await this.quizService.hasCompletedQuiz(quiz.id, userId);
        if (hasCompleted) return quiz;
      }

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
        quizId: { type: 'number', example: 7 },
        selectedOptionId: { type: 'number', example: 101 },
      },
    },
    examples: {
      check_mc: {
        summary: 'Check Multiple Choice answer',
        value: {
          quizId: 7,
          selectedOptionId: 101,
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
    @Body('quizId') quizId: string,
    @Body('selectedOptionId') selectedOptionId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.quizService.checkAnswer(String(quizId), getUserIdOrThrow(req.user), {
      questionId: Number(questionId),
      selectedOptionId,
    });
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
