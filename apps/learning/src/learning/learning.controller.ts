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
import { QuizSolutionResponseDto } from './dto/quiz-solution.dto';
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

@ApiTags('Quiz & Learning Progress')
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
          title: 'แบบทดสอบพื้นฐาน TypeScript',
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
            {
              question: 'ข้อใดไม่ใช่คุณสมบัติของ Arrow Function?',
              type: 'multiple_choice',
              options: [
                'เขียนสั้นลง',
                'ไม่มี arguments object',
                'มีตัวแปร this เป็นของตัวเอง',
                'ไม่สามารถใช้เป็น Constructor ได้',
              ],
              correctAnswer: 'มีตัวแปร this เป็นของตัวเอง',
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
              question: 'RAM คือหน่วยความจำถาวร ข้อมูลจะไม่หายไปเมื่อปิดเครื่อง',
              type: 'true_false',
              correctAnswerBool: false,
            },
            {
              question: 'HTTP เป็นโปรโตคอลที่ปลอดภัยกว่า HTTPS',
              type: 'true_false',
              correctAnswerBool: false,
            },
            {
              question: 'CPU ทำหน้าที่ประมวลผลคำสั่งต่างๆ ของคอมพิวเตอร์',
              type: 'true_false',
              correctAnswerBool: true,
            },
          ],
        },
      },
      match_pairs_only: {
        summary: 'Create quiz (Match Pairs Only)',
        value: {
          lessonId: 4,
          title: 'แบบทดสอบการจับคู่คำศัพท์',
          questions: [
            {
              question: 'จงจับคู่เครื่องมือกับหน้าที่ให้ถูกต้อง',
              type: 'match_pairs',
              optionsPairs: [
                { left: 'Git', right: 'Version Control' },
                { left: 'Docker', right: 'Containerization' },
                { left: 'Postman', right: 'API Testing' },
              ],
            },
          ],
        },
      },
      correct_order_only: {
        summary: 'Create quiz (Correct Order Only)',
        value: {
          lessonId: 5,
          title: 'ลำดับการล้างมือที่ถูกต้อง',
          questions: [
            {
              question: 'จงเรียงลำดับขั้นตอนการล้างมือให้ถูกต้องตามหลักอนามัย',
              type: 'correct_order',
              optionsOrder: [
                { text: 'ชโลมสบู่ลงบนฝ่ามือ' },
                { text: 'ถูมือให้สะอาดทุกซอกมุม' },
                { text: 'ล้างออกด้วยน้ำสะอาด' },
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
          '1 Lesson สามารถมีคำถามรวมได้สูงสุด 3 ข้อ (ปัจจุบันมีแล้ว 3 ข้อ)',
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
    const quizzesPromise = this.learningService.findAllQuizzes(lessonId);
    return quizzesPromise.then(async (list) => {
      const user = req.user;
      const isAdminOrInstructor =
        user?.role === UserRole.ADMIN || user?.role === UserRole.INSTRUCTOR;
      const userId = getUserIdOrThrow(user);

      if (!isAdminOrInstructor) {
        return Promise.all(
          list.map((q) => this.learningService.stripAnswers(q, userId)),
        );
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
      const userId = getUserIdOrThrow(user);

      // ถ้าเป็นแอดมิน/ผู้สอน ส่งข้อมูลเต็ม (มีเฉลย)
      if (isAdminOrInstructor) {
        return quiz;
      }

      // ถ้าเป็นนักเรียน:
      if (userId) {
        // 1. ถ้ามี Attempt ที่กำลังทำค้างอยู่ (Active) -> ต้องซ่อนเฉลยเสมอ
        // (เพื่อให้ Scenario 4 Retake สามารถทำใหม่ได้โดยไม่เห็นเฉลยก่อนส่ง)
        const activeAttempt = await this.learningService.getActiveAttempt(
          quiz.id,
          userId,
        );
        if (activeAttempt) {
          return this.learningService.stripAnswers(quiz, userId);
        }

        // 2. ถ้าไม่มี Active Attempt แต่เคยทำเสร็จแล้ว -> ให้ดูเฉลยได้
        const hasCompleted = await this.learningService.hasCompletedQuiz(
          quiz.id,
          userId,
        );
        if (hasCompleted) {
          return quiz;
        }
      }

      // กรณียังไม่ทำหรือยังไม่จบ -> ซ่อนเฉลย + สลับตัวเลือก
      return this.learningService.stripAnswers(quiz, userId);
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
        message: '1 Lesson สามารถมีคำถามรวมได้สูงสุด 3 ข้อ',
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
  @ApiBody({
    type: SubmitQuizDto,
    examples: {
      save_single_answer: {
        summary: 'Save just one answer (Draft)',
        value: {
          answers: [{ questionId: 31, answer: 'JavaScript' }],
        },
      },
      save_multiple_answers: {
        summary: 'Save multiple answers (Merge with existing)',
        value: {
          answers: [
            { questionId: 32, answer: true },
            { questionId: 33, answer: 'const' },
          ],
        },
      },
    },
  })
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
      submit_mc_only: {
        summary: 'Submit Multiple Choice answers',
        value: {
          answers: [
            { questionId: 31, answer: 'JavaScript' },
            { questionId: 32, answer: 'const' },
          ],
        },
      },
      submit_tf_only: {
        summary: 'Submit True/False answers',
        value: {
          answers: [
            { questionId: 35, answer: true },
            { questionId: 36, answer: false },
          ],
        },
      },
      submit_match_pairs_only: {
        summary: 'Submit Match Pairs answers',
        value: {
          answers: [
            {
              questionId: 32,
              answer: [
                { left: 'Git', right: 'Version Control' },
                { left: 'Docker', right: 'Containerization' },
                { left: 'Postman', right: 'API Testing' },
              ],
            },
          ],
        },
      },
      submit_correct_order_only: {
        summary: 'Submit Correct Order answers',
        value: {
          answers: [
            {
              questionId: 33,
              answer: [
                'ชโลมสบู่ลงบนฝ่ามือ',
                'ถูมือให้สะอาดทุกซอกมุม',
                'ล้างออกด้วยน้ำสะอาด',
              ],
            },
          ],
        },
      },
      submit_mixed: {
        summary: 'Submit mixed types (MC + T/F + Match)',
        value: {
          answers: [
            { questionId: 31, answer: 'Superset ของ JavaScript' },
            { questionId: 32, answer: true },
            {
              questionId: 33,
              answer: [
                { left: 'เจ้าตูบ', right: 'กระดูก' },
                { left: 'เจ้าเหมียว', right: 'ปลาทู' },
              ],
            },
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
          {
            questionId: 33,
            question: 'จงจับคู่สัตว์กับเสียง',
            type: 'match_pairs',
            options: [
              { left: 'สุนัข', right: 'โฮ่ง' },
              { left: 'แมว', right: 'เมี๊ยว' },
            ],
            userAnswer: [
              { left: 'สุนัข', right: 'โฮ่ง' },
              { left: 'แมว', right: 'เมี๊ยว' },
            ],
            isCorrect: true,
            correctAnswer: [
              { left: 'สุนัข', right: 'โฮ่ง' },
              { left: 'แมว', right: 'เมี๊ยว' },
            ],
          },
        ],
      },
    },
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

  @Get('quizzes/:id/solution')
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
    return this.learningService.getQuizSolution(
      id,
      getUserIdOrThrow(req.user),
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
