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
import {ApiTags,ApiOperation,ApiBearerAuth,ApiQuery,ApiResponse,ApiBody,ApiParam,
} from '@nestjs/swagger';
import { QuizService } from './quiz.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuizSolutionResponseDto } from './dto/quiz-solution.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { CheckAnswerDto } from './dto/check-answer.dto';
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

@ApiTags('Quiz')
@ApiBearerAuth()
@Controller('quizzes')
export class QuizController {
  constructor(
    private readonly quizService: QuizService,
  ) {}

  // Quiz CRUD
  @Post()
  @ApiOperation({ summary: 'Create a new quiz with questions' })
  @ApiBody({
    type: CreateQuizDto,
    examples: {
      multiple_choice_only: {
        summary: 'Create quiz (Multiple Choice Only)',
        value: {
          lessonId: 2,
          title: 'Quiz: JavaScript ES6+',
          questions: [
            {
              question: 'Keyword ใดใช้ประกาศตัวแปรที่เปลี่ยนค่าไม่ได้?',
              type: 'multiple_choice',
              options: ['var', 'let', 'const', 'static'],
              correctAnswer: 'const',
            },
          ],
        },
      },
      true_false_only: {
        summary: 'Create quiz (True/False Only)',
        value: {
          lessonId: 3,
          title: 'แบบทดสอบความเข้าใจพื้นฐาน IT',
          questions: [
            {
              question: 'CPU ทำหน้าที่ประมวลผลคำสั่งต่างๆ ของคอมพิวเตอร์',
              type: 'true_false',
              correctAnswerBool: true,
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
        message: '1 Lesson สามารถมีคำถามรวมได้สูงสุด 1 ข้อ (ปัจจุบันมีแล้ว 1 ข้อ)',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error.',
  })
  // @UseGuards(RolesGuard)
  // @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  createQuiz(@Body() createQuizDto: CreateQuizDto) {
    return this.quizService.createQuiz(createQuizDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all quizzes' })
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
    description: 'Invalid input data.',
    schema: {
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation failed (numeric string is expected)',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error.',
  })
  findAllQuizzes(
    @Request() req: RequestWithUser,
  ) {
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
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error.',
  })
  findOneQuiz(@Param('id') id: string, @Request() req: RequestWithUser) {
    const quizPromise = this.quizService.findOneQuiz(id);

    return quizPromise.then(async (quiz) => {
      const user = req.user;
      const isAdminOrInstructor =
        user?.role === UserRole.ADMIN || user?.role === UserRole.INSTRUCTOR;
      const userId = getUserIdOrThrow(user);

      // ถ้าเป็นแอดมิน/ผู้สอน ส่งข้อมูลเต็ม (มีเฉลย)
      if (isAdminOrInstructor) {
        return quiz;
      }

      // ถ้าเป็นนักเรียน:
      if (userId) {
        // 1. ถ้ามี Attempt ที่กำลังทำค้างอยู่ (Active) -> ต้องซ่อนเฉลยเสมอ
        // (เพื่อให้ Scenario 4 Retake สามารถทำใหม่ได้โดยไม่เห็นเฉลยก่อนส่ง)
        const activeAttempt = await this.quizService.getActiveAttempt(
          quiz.id,
          userId,
        );
        if (activeAttempt) {
          return this.quizService.stripAnswers(quiz, userId);
        }

        // 2. ถ้าไม่มี Active Attempt แต่เคยทำเสร็จแล้ว -> ให้ดูเฉลยได้
        const hasCompleted = await this.quizService.hasCompletedQuiz(
          quiz.id,
          userId,
        );
        if (hasCompleted) {
          return quiz;
        }
      }

      // กรณียังไม่ทำหรือยังไม่จบ -> ซ่อนเฉลย + สลับตัวเลือก
      return this.quizService.stripAnswers(quiz, userId);
    });
  }

  @Patch(':id')
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
    description: 'Invalid input data.',
    schema: {
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: '1 Lesson สามารถมีคำถามรวมได้สูงสุด 1 ข้อ',
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
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error.',
  })
  updateQuiz(@Param('id') id: string, @Body() updateQuizDto: UpdateQuizDto) {
    return this.quizService.updateQuiz(id, updateQuizDto);
  }

  @Delete(':id')
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
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error.',
  })
  removeQuiz(@Param('id') id: string) {
    return this.quizService.removeQuiz(id);
  }

  @Post(':id/start')
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
    return this.quizService.startQuiz(id, getUserIdOrThrow(req.user), {
      retry:
        typeof retry === 'string'
          ? ['true', '1'].includes(retry.trim().toLowerCase())
          : false,
    });
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete or skip a quiz' })
  @ApiParam({ name: 'id', example: 7 })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['COMPLETED', 'SKIPPED'] },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'จบหรือข้ามแบบทดสอบสำเร็จ',
  })
  completeQuiz(
    @Param('id') id: string,
    @Body('status') status: 'COMPLETED' | 'SKIPPED',
    @Request() req: RequestWithUser,
  ) {
    return this.quizService.completeQuiz(id, getUserIdOrThrow(req.user), status);
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
  })
  @ApiResponse({
    status: 200,
    description: 'ผลการตรวจคำถาม',
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

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit answers for a quiz attempt (Finalize)' })
  @ApiBody({
    type: SubmitQuizDto,
    examples: {
      submit_mc_only: {
        summary: 'Submit Multiple Choice answers',
        value: {
          answers: [
            { questionId: 31, answer: 'JavaScript' },
          ],
        },
      },
      submit_tf_only: {
        summary: 'Submit True/False answers',
        value: {
          answers: [
            { questionId: 35, answer: true },
          ],
        },
      },
      submit_mixed: {
        summary: 'Submit mixed types (MC + T/F)',
        value: {
          answers: [
            { questionId: 31, answer: 'Superset ของ JavaScript' },
            { questionId: 32, answer: true },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'ตรวจคะแนนและปิด Attempt สำเร็จ (คืนค่าผลคะแนนและเฉลย)',
    type: QuizSolutionResponseDto,
    schema: {
      example: {
        attemptId: 21,
        quizId: 7,
        correctCount: 2,
        totalQuestions: 3,
        score: 66.67,
        passed: true,
        completedAt: '2026-01-21T10:02:00.000Z',
        solutions: [
          {
            questionId: 31,
            question: 'TypeScript คืออะไร?',
            type: 'multiple_choice',
            options: ['Superset ของ JS', 'เกม', 'กาแฟ'],
            userAnswer: 'Superset ของ JS',
            isCorrect: true,
            correctAnswer: 'Superset ของ JS',
          },
          {
            questionId: 32,
            question: '2 + 2 = 4 ใช่หรือไม่?',
            type: 'true_false',
            options: ['True', 'False'],
            userAnswer: false,
            isCorrect: false,
            correctAnswer: true,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data.',
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
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error.',
  })
  submitQuiz(
    @Param('id') id: string,
    @Body() submitDto: SubmitQuizDto,
    @Request() req: RequestWithUser,
  ) {
    return this.quizService.submitQuiz(
      id,
      getUserIdOrThrow(req.user),
      submitDto,
    );
  }

  @Get(':id/solution')
  @ApiOperation({ summary: 'Get solution details for latest completed attempt' })
  @ApiParam({ name: 'id', example: 7 })
  @ApiResponse({
    status: 200,
    description: 'เฉลยคำตอบล่าสุด (คำตอบที่เลือก vs เฉลยที่ถูกต้อง)',
    type: QuizSolutionResponseDto,
    schema: {
      example: {
        attemptId: 21,
        quizId: 7,
        correctCount: 3,
        totalQuestions: 3,
        score: 100.0,
        passed: true,
        completedAt: '2026-01-21T10:02:00.000Z',
        solutions: [
          {
            questionId: 31,
            question: 'TypeScript คืออะไร?',
            type: 'multiple_choice',
            options: ['Superset ของ JS', 'เกม', 'กาแฟ'],
            userAnswer: 'Superset ของ JS',
            isCorrect: true,
            correctAnswer: 'Superset ของ JS',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'ยังไม่มีผลการทำแบบทดสอบสำหรับ Quiz นี้',
    schema: {
      example: {
        statusCode: 404,
        message: 'ยังไม่มีผลการทำแบบทดสอบสำหรับ Quiz นี้',
        error: 'Not Found',
      },
    },
  })
  getQuizSolution(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.quizService.getQuizSolution(
      id,
      getUserIdOrThrow(req.user),
    );
  }

  @Get(':id/attempts')
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
    return this.quizService.getAttempts(id, getUserIdOrThrow(req.user));
  }
}

@ApiTags('Question')
@ApiBearerAuth()
@Controller('questions')
export class QuestionController {
  constructor(private readonly quizService: QuizService) {}

  @Delete(':id')
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
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error.',
  })
  removeQuestion(@Param('id') id: string) {
    return this.quizService.removeQuestion(Number(id));
  }

  @Patch(':id')
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
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data.',
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
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error.',
  })
  updateQuestion(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.quizService.updateQuestion(Number(id), updateQuestionDto);
  }
}

@ApiTags('Internal')
@Controller('users')
export class InternalController {
  constructor(private readonly quizService: QuizService) {}

  @Get(':userId/stats')
  @ApiOperation({ summary: 'Get quiz stats for a user (Internal)' })
  @ApiParam({ name: 'userId', example: '1' })
  getUserStats(@Param('userId') userId: string) {
    return this.quizService.getUserAttemptStats(userId);
  }
}
