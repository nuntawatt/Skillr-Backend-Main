import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse, ApiParam } from '@nestjs/swagger';
import { QuizService } from './quiz.service';
import { CreateQuizsDto, CreateCheckpointDto, UpdateQuizsDto, UpdateCheckpointDto } from './dto';
import { JwtAuthGuard, RolesGuard, Roles } from '@auth';
import { UserRole } from '@common/enums';
import { CurrentUserId } from '../notifications/decorators/current-user-id.decorator';

@ApiTags('Admin | Quiz and Checkpoint')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/quizzes')
export class QuizAdminController {
  constructor(private readonly quizService: QuizService) { }

  // สร้างหรืออัปเดต quiz สำหรับบทเรียน (1 บทเรียน = 1 ควิซ)
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

  // อัปเดต quiz ตาม lesson ID
  @Patch('lesson/:lessonId')
  @ApiOperation({ summary: 'อัปเดต quiz ตาม lesson ID' })
  @ApiParam({
    name: 'lessonId',
    type: Number,
    description: 'ID ของบทเรียน',
  })
  @ApiBody({
    type: UpdateQuizsDto,
    examples: {
      multiple_choice: {
        summary: 'ตัวอย่าง: อัปเดต Quiz แบบเลือกตอบ (MC)',
        value: {
          quizs_type: 'multiple_choice',
          quizs_questions: 'TypeScript คืออะไร?',
          quizs_option: ['Superset ของ JavaScript', 'ชื่อกาแฟ', 'ระบบปฏิบัติการ'],
          quizs_answer: 'Superset ของ JavaScript',
          quizs_explanation: 'TypeScript เป็นภาษาที่สร้างครอบ JS เพื่อเพิ่มระบบ Type',
        },
      },
      true_false: {
        summary: 'ตัวอย่าง: อัปเดต Quiz แบบถูก/ผิด (TF)',
        value: {
          quizs_type: 'true_false',
          quizs_questions: 'Node.js คือภาษาโปรแกรมใช่หรือไม่?',
          quizs_option: ['True', 'False'],
          quizs_answer: 'False',
          quizs_explanation: 'Node.js เป็น Runtime environment สำหรับรัน JS',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Quiz updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  updateQuiz(@Param('lessonId', ParseIntPipe) lessonId: number, @Body() dto: Partial<UpdateQuizsDto>) {
    return this.quizService.updateQuizs(lessonId, dto);
  }

  @Get('lesson/:lessonId')
  @ApiOperation({ summary: 'ดึง quiz ตาม lesson ID' })
  @ApiParam({
    name: 'lessonId',
    type: Number,
    description: 'ID ของบทเรียน',
  })
  @ApiResponse({ status: 200, description: 'Quiz retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  findQuizByLessonAdmin(
    @Param('lessonId', ParseIntPipe) lessonId: number,
  ) {
    return this.quizService.findOneQuizsByLesson(lessonId);
  }

  // ลบ quiz ตาม lesson ID
  @Delete('lesson/:lessonId')
  @ApiOperation({ summary: 'ลบ quiz ตาม lesson ID' })
  @ApiParam({
    name: 'lessonId',
    type: Number,
  })
  @ApiResponse({ status: 204, description: 'Quiz deleted successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  removeQuiz(@Param('lessonId', ParseIntPipe) lessonId: number) {
    return this.quizService.removeQuizs(lessonId);
  }

  // อัปเดต quiz ตาม lesson ID
  @Post('checkpoint')
  @ApiOperation({ summary: 'สร้างหรืออัปเดต checkpoint สำหรับบทเรียน (1 บทเรียน = 1 checkpoint)' })
  @ApiBody({
    type: CreateCheckpointDto,
    examples: {
      multiple_choice: {
        summary: 'ตัวอย่าง: Checkpoint แบบเลือกตอบ',
        value: {
          lesson_id: 1,
          checkpoint_type: 'multiple_choice',
          checkpoint_questions: '1 + 1 เท่ากับเท่าไหร่?',
          checkpoint_option: ['1', '2', '3'],
          checkpoint_answer: '2',
          checkpoint_explanation: '1 + 1 = 2',
        },
      },
      true_false: {
        summary: 'ตัวอย่าง: Checkpoint แบบถูก/ผิด',
        value: {
          lesson_id: 2,
          checkpoint_type: 'true_false',
          checkpoint_questions: 'Node.js คือภาษาโปรแกรมใช่หรือไม่?',
          checkpoint_option: ['True', 'False'],
          checkpoint_answer: 'False',
          checkpoint_explanation: 'Node.js เป็น Runtime environment สำหรับรัน JavaScript ไม่ใช่ภาษาโปรแกรม',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Checkpoint created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createCheckpoint(@Body() dto: CreateCheckpointDto) {
    const checkpoint = await this.quizService.createCheckpoint(dto);
    return {
      ...checkpoint,
      score: checkpoint.checkpointScore ?? 5,
    };
  }

  @Get('checkpoint/:lessonId')
  @ApiOperation({ summary: 'ดึง checkpoint ตาม lesson ID' })
  @ApiParam({ name: 'lessonId', type: Number })
  @ApiResponse({ status: 200, description: 'Checkpoint retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Checkpoint not found' })
  async findCheckpointByLessonId(@Param('lessonId', ParseIntPipe) lessonId: number) {
    const checkpoint = await this.quizService.findOneCheckpointByLessonId(lessonId);
    return { ...checkpoint, score: checkpoint.checkpointScore ?? 5 };
  }

  // อัปเดต checkpoint ตาม lesson ID
  @Patch('checkpoint/:lessonId')
  @ApiOperation({ summary: 'อัปเดต checkpoint ตาม lesson ID' })
  @ApiParam({ name: 'lessonId', type: Number })
  @ApiBody({
    type: UpdateCheckpointDto,
    examples: {
      multiple_choice: {
        summary: 'ตัวอย่าง: อัปเดต Checkpoint แบบเลือกตอบ',
        value: {
          checkpoint_type: 'multiple_choice',
          checkpoint_questions: '1 + 1 เท่ากับเท่าไหร่?',
          checkpoint_option: ['1', '2', '3'],
          checkpoint_answer: '2',
          checkpoint_explanation: '1 + 1 = 2',
        },
      },
      true_false: {
        summary: 'ตัวอย่าง: อัปเดต Checkpoint แบบถูก/ผิด',
        value: {
          checkpoint_type: 'true_false',
          checkpoint_questions: 'Node.js คือภาษาโปรแกรมใช่หรือไม่?',
          checkpoint_option: ['True', 'False'],
          checkpoint_answer: 'False',
          checkpoint_explanation: 'Node.js เป็น Runtime environment สำหรับรัน JavaScript ไม่ใช่ภาษาโปรแกรม',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Checkpoint updated successfully' })
  @ApiResponse({ status: 404, description: 'Checkpoint not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async updateCheckpoint(
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @Body() dto: Partial<UpdateCheckpointDto>,
  ) {
    const checkpoint = await this.quizService.updateCheckpointByLessonId(lessonId, dto);
    return { ...checkpoint, score: checkpoint.checkpointScore ?? 5 };
  }

  // ลบ checkpoint ตาม lesson ID
  @Delete('checkpoint/:lessonId')
  @ApiOperation({ summary: 'ลบ checkpoint ตาม lesson ID' })
  @ApiParam({
    name: 'lessonId',
    type: Number,
  })
  @ApiResponse({ status: 204, description: 'Checkpoint deleted successfully' })
  @ApiResponse({ status: 404, description: 'Checkpoint not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  removeCheckpoint(
    @Param('lessonId', ParseIntPipe) lessonId: number,
  ) {
    return this.quizService.removeCheckpointByLessonId(lessonId);
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
  @ApiOperation({ summary: 'ดึง quiz พร้อมสถานะตาม lesson ID - ถ้าทำแล้วจะแสดงผลลัพธ์ทั้งหมด' })
  @ApiParam({
    name: 'lessonId',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz retrieved successfully',
    schema: {
      oneOf: [
        {
          title: 'Quiz not attempted',
          type: 'object',
          properties: {
            quizs_id: { type: 'number', example: 1 },
            quizs_type: { type: 'string', example: 'multiple_choice' },
            quizs_question: { type: 'string', example: 'TypeScript คืออะไร?' },
            quizs_option: {
              type: 'array',
              items: { type: 'string' },
              example: ['Superset ของ JavaScript', 'ชื่อกาแฟ', 'ระบบปฏิบัติการ']
            },
            lesson_id: { type: 'number', example: 1 },
            quizs_answer: { type: 'null', example: null },
            quizs_explanation: { type: 'null', example: null },
            status: { type: 'string', example: 'NOT_ATTEMPTED' },
            user_answer: { type: 'null', example: null },
            is_correct: { type: 'null', example: null },
            completed_at: { type: 'null', example: null }
          }
        },
        {
          title: 'Quiz completed',
          type: 'object',
          properties: {
            quizs_id: { type: 'number', example: 1 },
            quizs_type: { type: 'string', example: 'multiple_choice' },
            quizs_question: { type: 'string', example: 'TypeScript คืออะไร?' },
            quizs_option: {
              type: 'array',
              items: { type: 'string' },
              example: ['Superset ของ JavaScript', 'ชื่อกาแฟ', 'ระบบปฏิบัติการ']
            },
            lesson_id: { type: 'number', example: 1 },
            quizs_answer: { type: 'string', example: 'Superset ของ JavaScript' },
            quizs_explanation: { type: 'string', example: 'TypeScript เป็นภาษาที่สร้างครอบ JS เพื่อเพิ่มระบบ Type' },
            status: { type: 'string', example: 'COMPLETED' },
            user_answer: { type: 'string', example: 'Superset ของ JavaScript' },
            is_correct: { type: 'boolean', example: true },
            completed_at: { type: 'string', example: '2024-01-15T10:30:00Z' }
          }
        }
      ]
    }
  })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  @ApiResponse({ status: 409, description: 'This quiz has already been attempted and cannot be answered again' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findOneQuizByLesson(
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @CurrentUserId() userId: string,
  ) {
    return this.quizService.getQuizWithStatus(lessonId, userId);
  }

  @Get('checkpoint/:lessonId')
  @ApiOperation({ summary: 'ดึง checkpoint พร้อม Student_Progress ตาม lesson ID' })
  @ApiParam({
    name: 'lessonId',
    type: Number,
    description: 'ID ของบทเรียน',
  })
  @ApiResponse({ status: 200, description: 'Checkpoints retrieved successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findCheckpointsByLesson(
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @CurrentUserId() userId: string,
  ) {
    return this.quizService.findCheckpointsByLesson(lessonId, userId);
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
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @CurrentUserId() userId: string,
    @Body('answer') answer: any,
  ) {
    return this.quizService.checkAndSaveAnswer(lessonId, userId, answer);
  }

  @Post('lesson/:lessonId/skip')
  @ApiOperation({ summary: 'ข้าม quiz และบันทึกสถานะเป็น completed' })
  @ApiParam({
    name: 'lessonId',
    type: Number,
    description: 'ID ของบทเรียน',
  })
  @ApiResponse({ status: 200, description: 'Quiz skipped successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  skipQuiz(@Param('lessonId', ParseIntPipe) lessonId: number, @CurrentUserId() userId: string) {
    return this.quizService.skipQuiz(lessonId, userId);
  }

  @Post('checkpoint/:checkpointId/check')
  @ApiOperation({ summary: 'ตรวจคำตอบ checkpoint ตาม id' })
  @ApiParam({
    name: 'checkpointId',
    type: Number,
    description: 'Checkpoint ID (ไม่ใช่ lessonId)',
  })
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
    @Param('checkpointId', ParseIntPipe) checkpointId: number,
    @CurrentUserId() userId: string,
    @Body('answer') answer: any,
  ) {
    return this.quizService.checkCheckpointAnswer(checkpointId, userId, answer);
  }

  @Post('checkpoint/:checkpointId/skip')
  @ApiOperation({ summary: 'ข้าม checkpoint และบันทึกสถานะเป็น skipped' })
  @ApiParam({
    name: 'checkpointId',
    type: Number,
    description: 'Checkpoint ID (ไม่ใช่ lessonId)',
  })
  @ApiResponse({ status: 200, description: 'Checkpoint skipped successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  skipCheckpoint(
    @Param('checkpointId', ParseIntPipe) checkpointId: number,
    @CurrentUserId() userId: string,
  ) {
    return this.quizService.skipCheckpoint(checkpointId, userId);
  }
}