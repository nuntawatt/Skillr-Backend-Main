import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';
import { QuizService } from './quiz.service';
import { CreateQuizsDto, CreateCheckpointDto } from './dto/create-quizs.dto';
import { JwtAuthGuard, RolesGuard, Roles } from '@auth';
import { UserRole } from '@common/enums';
import { CurrentUserId } from '../progress/decorators/current-user-id.decorator';

@ApiTags('Admin | Quiz and Checkpoint')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles(UserRole.ADMIN)
@Controller('admin/quizzes')
export class QuizAdminController {
  constructor(private readonly quizService: QuizService) { }

  @Post()
  @ApiOperation({ summary: 'สร้างหรืออัปเดต quiz สำหรับบทเรียน (1 บทเรียน = 1 ควิซ)' })
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
          quizs_explanation: 'TypeScript เป็นภาษาที่สร้างครอบ JS เพื่อเพิ่มระบบ Type',
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
          quizs_explanation: 'Node.js เป็น Runtime environment สำหรับรัน JS',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Quiz created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  createQuiz(@Body() dto: CreateQuizsDto) {
    return this.quizService.createQuizs(dto);
  }

  @Post('checkpoint')
  @ApiOperation({ summary: 'สร้างหรืออัปเดต checkpoint สำหรับบทเรียน (1 บทเรียน = 1 checkpoint)' })
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
  @ApiResponse({ status: 201, description: 'Checkpoint created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  createCheckpoint(@Body() dto: CreateCheckpointDto) {
    return this.quizService.createCheckpoint(dto);
  }

  @Patch('lesson/:lessonId')
  @ApiOperation({ summary: 'อัปเดต quiz ตาม lesson ID' })
  @ApiResponse({ status: 200, description: 'Quiz updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  updateQuiz(@Param('lessonId') lessonId: string, @Body() dto: Partial<CreateQuizsDto>) {
    return this.quizService.updateQuizs(Number(lessonId), dto);
  }

  @Delete('lesson/:lessonId')
  @ApiOperation({ summary: 'ลบ quiz ตาม lesson ID' })
  @ApiResponse({ status: 204, description: 'Quiz deleted successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  removeQuiz(@Param('lessonId') lessonId: string) {
    return this.quizService.removeQuizs(Number(lessonId));
  }
}


@ApiTags('Student | Quiz and Checkpoint')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quizzes')
export class QuizController {
  constructor(private readonly quizService: QuizService) { }

  @Get()
  @ApiOperation({ summary: 'ดึงรายการ quiz ทั้งหมด' })
  @ApiResponse({ status: 200, description: 'List of quizzes retrieved successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAllQuizzes() {
    return this.quizService.findAllQuizs();
  }

  @Get('lesson/:lessonId')
  @ApiOperation({ summary: 'ดึง quiz พร้อมสถานะตาม lesson ID' })
  @ApiResponse({ status: 200, description: 'Quiz retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findOneQuizByLesson(
    @Param('lessonId') lessonId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.quizService.getQuizWithStatus(Number(lessonId), userId);
  }

  @Get('checkpoint/:lessonId')
  @ApiOperation({ summary: 'ดึง checkpoint ตาม lesson ID' })
  @ApiResponse({ status: 200, description: 'Checkpoints retrieved successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findCheckpointsByLesson(@Param('lessonId') lessonId: string) {
    return this.quizService.findCheckpointsByLesson(Number(lessonId));
  }

  @Post('lesson/:lessonId/check')
  @ApiOperation({ summary: 'ตรวจคำตอบ quiz และบันทึกผล' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        answer: {
          description: 'User answer (string | boolean | number | array | object). Must match stored quiz answer shape.',
        },
      },
      required: ['answer'],
    },
    examples: {
      multiple_choice: {
        summary: 'ตัวอย่าง: เลือกตอบ',
        value: { answer: '2' },
      },
      true_false: {
        summary: 'ตัวอย่าง: ถูก/ผิด',
        value: { answer: 'True' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Answer checked and saved successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  checkQuizs(
    @Param('lessonId') lessonId: string,
    @CurrentUserId() userId: string,
    @Body('answer') answer: any,
  ) {
    return this.quizService.checkAndSaveAnswer(Number(lessonId), userId, answer);
  }

  @Post('lesson/:lessonId/skip')
  @ApiOperation({ summary: 'ข้าม quiz และบันทึกสถานะเป็น completed' })
  @ApiResponse({ status: 200, description: 'Quiz skipped successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  skipQuiz(@Param('lessonId') lessonId: string, @CurrentUserId() userId: string) {
    return this.quizService.skipQuiz(Number(lessonId), userId);
  }

  @Post('checkpoint/:id/check')
  @ApiOperation({ summary: 'ตรวจคำตอบ checkpoint ตาม id' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        answer: {
          description: 'User answer (string | boolean | number | array | object). Must match stored checkpoint answer shape.',
        },
      },
      required: ['answer'],
    },
    examples: {
      example: {
        summary: 'ตัวอย่าง',
        value: { answer: '2' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Checkpoint answer checked successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  checkCheckpoint(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body('answer') answer: any,
  ) {
    return this.quizService.checkCheckpointAnswer(Number(id), userId, answer);
  }
}