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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
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

@ApiTags('Learning & Quizzes')
@ApiBearerAuth()
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
  @ApiOperation({ summary: 'Create a new quiz with questions' })
  @ApiBody({
    type: CreateQuizDto,
    examples: {
      mixed_3_types: {
        summary: 'Create quiz (3 questions: MC + T/F + MatchPairs)',
        value: {
          lessonId: 1,
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
            },
            {
              question: 'TypeScript ต้อง compile เป็น JavaScript ก่อนรันใช่หรือไม่?',
              type: 'true_false',
              correctAnswerBool: true,
            },
            {
              question: 'จงจับคู่สัตว์กับอาหารที่ชอบให้ถูกต้อง',
              type: 'match_pairs',
              optionsPairs: [
                { left: 'เจ้าตูบ', right: 'กระดูก' },
                { left: 'เจ้าเหมียว', right: 'ปลาทู' },
              ],
            },
          ],
        },
      },
      correct_order_only: {
        summary: 'Create quiz (Correct Order only)',
        value: {
          lessonId: 1,
          questions: [
            {
              question: 'จงเรียงลำดับขั้นตอนการติดตั้งโปรเจกต์',
              type: 'correct_order',
              optionsOrder: [
                { text: 'git clone' },
                { text: 'npm install' },
                { text: 'npm run dev' },
              ],
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error / quota exceeded',
    schema: {
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message:
          '1 Lesson สามารถมีคำถามรวมได้สูงสุด 30 ข้อ (ปัจจุบันมีแล้ว 30 ข้อ)',
      },
    },
  })
  // @UseGuards(RolesGuard)
  // @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  createQuiz(@Body() createQuizDto: CreateQuizDto) {
    return this.learningService.createQuiz(createQuizDto);
  }

  @Get('quizzes')
  @ApiOperation({ summary: 'Get all quizzes, optionally filtered by lessonId' })
  @ApiQuery({
    name: 'lessonId',
    required: false,
    example: 1,
    description: 'กรองรายการ Quiz ตาม lessonId',
  })
  @ApiResponse({
    status: 200,
    description: 'รายการ Quiz (questions จะถูกเรียงตาม order ASC)',
    schema: {
      example: [
        {
          id: 7,
          lessonId: 1,
          isActive: true,
          createdAt: '2026-01-08T06:48:46.992Z',
          updatedAt: '2026-01-08T06:48:46.992Z',
          questions: [
            {
              id: 13,
              question: 'ข้อใดคือหน่วยประมวลผลกลาง?',
              type: 'multiple_choice',
              options: ['RAM', 'CPU', 'GPU', 'SSD'],
              correctAnswer: 'CPU',
              points: 1,
              order: 1,
              quizId: 7,
              createdAt: '2026-01-08T06:48:47.011Z',
              updatedAt: '2026-01-08T06:48:47.011Z',
            },
          ],
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query param',
    schema: {
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation failed (numeric string is expected)',
      },
    },
  })
  findAllQuizzes(
    @Request() req: RequestWithUser,
    @Query('lessonId') lessonId?: string,
  ) {
    const quizzes = this.learningService.findAllQuizzes(lessonId);
    return quizzes.then((list) => {
      const user = req.user;
      const isAdminOrInstructor =
        user?.role === UserRole.ADMIN || user?.role === UserRole.INSTRUCTOR;

      if (!isAdminOrInstructor) {
        return list.map((q) => this.learningService.stripAnswers(q));
      }
      return list;
    });
  }

  @Get('quizzes/:id')
  @ApiOperation({ summary: 'Get quiz by id' })
  @ApiParam({ name: 'id', example: 7 })
  @ApiResponse({
    status: 200,
    description:
      'รายละเอียด Quiz (ถ้าเป็นนักเรียน ระบบจะซ่อนเฉลย และสลับตัวเลือกบางประเภท)',
    schema: {
      example: {
        id: 7,
        lessonId: 1,
        isActive: true,
        createdAt: '2026-01-08T06:48:46.992Z',
        updatedAt: '2026-01-08T06:48:46.992Z',
        questions: [
          {
            id: 13,
            question: 'ข้อใดคือหน่วยประมวลผลกลาง?',
            type: 'multiple_choice',
            options: ['GPU', 'SSD', 'RAM', 'CPU'],
            points: 1,
            order: 1,
            quizId: 7,
            createdAt: '2026-01-08T06:48:47.011Z',
            updatedAt: '2026-01-08T06:48:47.011Z',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz not found',
    schema: {
      example: {
        statusCode: 404,
        error: 'Not Found',
        message: 'Quiz with ID 999 not found',
      },
    },
  })
  findOneQuiz(@Param('id') id: string, @Request() req: RequestWithUser) {
    const quizPromise = this.learningService.findOneQuiz(id);

    return quizPromise.then(async (quiz) => {
      const user = req.user;
      const isAdminOrInstructor =
        user?.role === UserRole.ADMIN || user?.role === UserRole.INSTRUCTOR;
      const userId =
        typeof user?.id === 'string' || typeof user?.id === 'number'
          ? String(user.id)
          : typeof user?.sub === 'string' || typeof user?.sub === 'number'
          ? String(user.sub)
          : undefined;

      // ถ้าเป็นแอดมิน/ผู้สอน ส่งข้อมูลเต็ม (มีเฉลย)
      if (isAdminOrInstructor) {
        return quiz;
      }

      // ถ้าเป็นนักเรียน: ถ้าเคยทำจบแล้ว ให้แสดงเฉลยได้
      if (userId) {
        const hasCompleted = await this.learningService.hasCompletedQuiz(
          quiz.id,
          userId,
        );
        if (hasCompleted) {
          return quiz;
      }
      }

      // กรณียังไม่ทำหรือยังไม่จบ -> ซ่อนเฉลย + สลับตัวเลือก
      return this.learningService.stripAnswers(quiz);
    });
  }

  @Patch('quizzes/:id')
  // @UseGuards(RolesGuard)
  // @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiBody({
    type: UpdateQuizDto,
    examples: {
      update_lessonId_only: {
        summary: 'Update quiz (change lessonId only)',
        value: { lessonId: 2 },
      },
      update_questions_replace: {
        summary:
          'Update quiz (replace questions array; note: questions must follow type validations)',
        value: {
          questions: [
            {
              question: '1 + 1 เท่ากับเท่าไหร่?',
              type: 'multiple_choice',
              options: ['1', '2', '3'],
              correctAnswer: '2',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error / too many questions',
    schema: {
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: '1 Lesson สามารถมีคำถามรวมได้สูงสุด 30 ข้อ',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz not found',
    schema: {
      example: {
        statusCode: 404,
        error: 'Not Found',
        message: 'Quiz with ID 999 not found',
      },
    },
  })
  updateQuiz(@Param('id') id: string, @Body() updateQuizDto: UpdateQuizDto) {
    return this.learningService.updateQuiz(id, updateQuizDto);
  }

  @Delete('quizzes/:id')
  // @UseGuards(RolesGuard)
  // @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Delete quiz' })
  @ApiParam({ name: 'id', example: 7 })
  @ApiResponse({
    status: 200,
    description: 'ลบ Quiz สำเร็จ (จะลบ Questions/Attempts ที่เกี่ยวข้องตาม cascade)',
    schema: { example: { success: true } },
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz not found',
    schema: {
      example: {
        statusCode: 404,
        error: 'Not Found',
        message: 'Quiz with ID 999 not found',
      },
    },
  })
  removeQuiz(@Param('id') id: string) {
    return this.learningService.removeQuiz(id);
  }

  @Delete('questions/:id')
  // @UseGuards(RolesGuard)
  // @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Delete question (and re-index remaining questions)' })
  @ApiParam({ name: 'id', example: 13 })
  @ApiResponse({
    status: 200,
    description: 'ลบคำถามสำเร็จ และระบบจะ re-index order ของคำถามที่เหลือใน quiz เดียวกัน',
    schema: { example: { success: true } },
  })
  @ApiResponse({
    status: 404,
    description: 'Question not found',
    schema: {
      example: {
        statusCode: 404,
        error: 'Not Found',
        message: 'Question not found',
      },
    },
  })
  removeQuestion(@Param('id') id: string) {
    return this.learningService.removeQuestion(Number(id));
  }

  @Patch('questions/:id')
  // @UseGuards(RolesGuard)
  // @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiBody({
    type: UpdateQuestionDto,
    examples: {
      update_mc: {
        summary: 'Update question (Multiple Choice)',
        value: {
          question: 'ข้อใดคือหน่วยประมวลผลกลาง?',
          type: 'multiple_choice',
          options: ['RAM', 'CPU', 'GPU', 'SSD'],
          correctAnswer: 'CPU',
        },
      },
      update_true_false: {
        summary: 'Update question (True/False)',
        value: {
          question: 'อินเทอร์เน็ตคือเครือข่ายคอมพิวเตอร์ที่เชื่อมโยงกันทั่วโลก',
          type: 'true_false',
          correctAnswerBool: true,
        },
      },
      update_match_pairs: {
        summary: 'Update question (Match Pairs)',
        value: {
          question: 'จงจับคู่เครื่องหมายกับชื่อเรียกให้ถูกต้อง',
          type: 'match_pairs',
          optionsPairs: [
            { left: '[]', right: 'Array' },
            { left: '{}', right: 'Object' },
          ],
        },
      },
      update_correct_order: {
        summary: 'Update question (Correct Order)',
        value: {
          question: 'จงเรียงลำดับขั้นตอนตอนเช้า',
          type: 'correct_order',
          optionsOrder: [
            { text: 'ตื่นนอน' },
            { text: 'แปรงฟัน' },
            { text: 'ไปทำงาน' },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: {
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: ['options must contain at least 3 elements'],
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Question not found',
    schema: {
      example: {
        statusCode: 404,
        error: 'Not Found',
        message: 'Question not found',
      },
    },
  })
  updateQuestion(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.learningService.updateQuestion(Number(id), updateQuestionDto);
  }

  // Quiz attempts
  @Post('quizzes/:id/start')
  @ApiOperation({ summary: 'Start a quiz attempt (or continue existing one)' })
  @ApiParam({ name: 'id', example: 7 })
  @ApiQuery({
    name: 'retry',
    required: false,
    description: 'ถ้าเคยทำเสร็จแล้วและต้องการเริ่มใหม่ ให้ส่ง retry=true',
    example: 'true',
  })
  @ApiResponse({
    status: 200,
    description:
      'สร้าง Attempt ใหม่ หรือดึง Attempt เดิมที่ยังทำไม่เสร็จกลับมา',
    schema: {
      example: {
        id: 21,
        quizId: 7,
        userId: 1,
        startedAt: '2026-01-14T10:00:00.000Z',
        completedAt: null,
        answers: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'กรณีที่เคยทำ Quiz นี้เสร็จไปแล้วและไม่ได้ขอ retry (หรือพบข้อผิดพลาดอื่นๆ)',
  })
  startQuiz(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Query('retry') retry?: string,
  ) {
    return this.learningService.startQuiz(id, getUserIdOrThrow(req.user), {
      retry:
        typeof retry === 'string'
          ? ['true', '1'].includes(retry.trim().toLowerCase())
          : false,
    });
  }

  @Post('quizzes/:id/save-progress')
  @ApiOperation({ summary: 'Save quiz progress (Draft)' })
  @ApiParam({ name: 'id', example: 7 })
  @ApiBody({ type: SubmitQuizDto })
  saveProgress(
    @Param('id') id: string,
    @Body() submitDto: SubmitQuizDto,
    @Request() req: RequestWithUser,
  ) {
    return this.learningService.saveProgress(
      id,
      getUserIdOrThrow(req.user),
      submitDto,
    );
  }

  @Post('quizzes/:id/submit')
  @ApiOperation({ summary: 'Submit answers for a quiz attempt (Finalize)' })
  @ApiBody({
    type: SubmitQuizDto,
    examples: {
      submit_mixed: {
        summary: 'Submit answers (mixed types)',
        value: {
          answers: [
            { questionId: 1, answer: 'Superset ของ JavaScript' },
            { questionId: 2, answer: true },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'ตรวจคะแนนและปิด Attempt สำเร็จ',
  })
  @ApiResponse({
    status: 400,
    description: 'กรณีที่ไม่มี Attempt ค้างอยู่ หรือเคยทำเสร็จไปแล้ว (ห้ามส่งซ้ำ)',
    schema: {
      example: {
        statusCode: 400,
        message: 'คุณได้ทำ Quiz นี้เสร็จสิ้นแล้ว ไม่สามารถส่งซ้ำได้',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz not found',
  })
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
  @ApiOperation({ summary: 'Get my attempts for a quiz' })
  @ApiParam({ name: 'id', example: 7 })
  @ApiResponse({
    status: 200,
    description: 'รายการ attempt ของ user คนนี้สำหรับ quiz นี้',
    schema: {
      example: [
        {
          id: 21,
          quizId: 7,
          userId: 1,
          startedAt: '2026-01-14T10:00:00.000Z',
          completedAt: '2026-01-14T10:02:00.000Z',
          score: 100,
          passed: true,
          answers: [
            { questionId: 13, answer: 'CPU' },
            { questionId: 14, answer: true },
          ],
          results: [
            { questionId: 13, isCorrect: true },
            { questionId: 14, isCorrect: true },
          ],
          createdAt: '2026-01-14T10:00:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid id param',
    schema: {
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation failed (numeric string is expected)',
      },
    },
  })
  getMyAttempts(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.learningService.getAttempts(id, getUserIdOrThrow(req.user));
  }

  @Post('lessons/:id/complete')
  @ApiOperation({ summary: 'Mark lesson as completed' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'บันทึก lesson completed (upsert)',
    schema: {
      example: {
        id: 5,
        userId: 1,
        lessonId: 1,
        completedAt: '2026-01-14T10:05:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid id param',
    schema: {
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation failed (numeric string is expected)',
      },
    },
  })
  completeLesson(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.learningProgressService.completeLesson(
      getUserIdOrThrow(req.user),
      id,
    );
  }

  @Get('progress')
  @ApiOperation({ summary: 'Get progress summary' })
  @ApiResponse({
    status: 200,
    description: 'สรุป progress ของ user',
    schema: {
      example: {
        totalCompleted: 5,
        streakDays: 3,
        lastCompletedAt: '2026-01-14T10:05:00.000Z',
      },
    },
  })
  getProgressSummary(@Request() req: RequestWithUser) {
    return this.learningProgressService.getSummary(getUserIdOrThrow(req.user));
  }

  @Get('lessons/:id/progress')
  @ApiOperation({ summary: 'Get progress for a specific lesson' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({
    status: 200,
    description:
      'สถานะ progress ของ lesson นี้ (ถ้ายังไม่เคย complete อาจเป็น null)',
    schema: {
      example: {
        id: 5,
        userId: 1,
        lessonId: 1,
        completedAt: '2026-01-14T10:05:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid id param',
    schema: {
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation failed (numeric string is expected)',
      },
    },
  })
  getLessonProgress(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.learningProgressService.getLessonProgress(
      getUserIdOrThrow(req.user),
      id,
    );
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get learning dashboard' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard รวม progress + สถิติการทำ quiz',
    schema: {
      example: {
        progress: {
          totalCompleted: 5,
          streakDays: 3,
          lastCompletedAt: '2026-01-14T10:05:00.000Z',
        },
        quizzes: {
          totalAttempts: 12,
          passedAttempts: 8,
          latestAttempt: {
            quizId: 7,
            score: 100,
            passed: true,
            completedAt: '2026-01-14T10:02:00.000Z',
          },
        },
      },
    },
  })
  getDashboard(@Request() req: RequestWithUser) {
    return this.learningDashboardService.getDashboard(
      getUserIdOrThrow(req.user),
    );
  }
}
