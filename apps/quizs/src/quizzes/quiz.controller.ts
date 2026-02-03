import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { QuizService } from './quiz.service';
import { CreateQuizsDto, CreateCheckpointDto } from './dto/create-quizs.dto';
import { JwtAuthGuard, RolesGuard, Roles } from '@auth';
import type { AuthUser } from '@auth';
import { UserRole } from '@common/enums';

type RequestWithUser = {
  user?: AuthUser;
};

function getUserIdOrThrow(user?: AuthUser): number {
  const raw = user?.id ?? user?.sub;
  if (raw) return Number(raw);
  // For testing without Auth: return a dummy ID instead of throwing
  return 1;
}

@ApiTags('Admin | Quiz')
@ApiBearerAuth()
@Controller('admin/quizzes')
//@UseGuards(JwtAuthGuard, RolesGuard)
//@Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
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

  @Patch('lesson/:lessonId')
  @ApiOperation({ summary: 'Update quiz by lesson id' })
  updateQuiz(@Param('lessonId') lessonId: string, @Body() dto: Partial<CreateQuizsDto>) {
    return this.quizService.updateQuizs(Number(lessonId), dto);
  }

  @Delete('lesson/:lessonId')
  @ApiOperation({ summary: 'Delete quiz by lesson id' })
  removeQuiz(@Param('lessonId') lessonId: string) {
    return this.quizService.removeQuizs(Number(lessonId));
  }
}

@ApiTags('Student | Quiz')
@ApiBearerAuth()
@Controller('quizzes')
// @UseGuards(JwtAuthGuard) // ปิดไว้ชั่วคราวเพื่อการทดสอบ
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Get()
  @ApiOperation({ summary: 'Get all quizzes' })
  findAllQuizzes() {
    return this.quizService.findAllQuizs();
  }

  @Get('lesson/:lessonId')
  @ApiOperation({ summary: 'Get quiz with status by lesson id' })
  findOneQuizByLesson(@Param('lessonId') lessonId: string, @Request() req: RequestWithUser) {
    return this.quizService.getQuizWithStatus(Number(lessonId), getUserIdOrThrow(req.user));
  }

  @Get('checkpoint/:lessonId')
  @ApiOperation({ summary: 'Get checkpoints by lesson id' })
  findCheckpointsByLesson(@Param('lessonId') lessonId: string) {
    return this.quizService.findCheckpointsByLesson(Number(lessonId));
  }

  @Post('lesson/:lessonId/check')
  @ApiOperation({ summary: 'Check and Save answer for quiz by lesson id' })
  checkQuizs(@Param('lessonId') lessonId: string, @Body('answer') answer: any, @Request() req: RequestWithUser) {
    return this.quizService.checkAndSaveAnswer(Number(lessonId), getUserIdOrThrow(req.user), answer);
  }

  @Post('lesson/:lessonId/skip')
  @ApiOperation({ summary: 'Skip quiz and mark as completed' })
  skipQuiz(@Param('lessonId') lessonId: string, @Request() req: RequestWithUser) {
    return this.quizService.skipQuiz(Number(lessonId), getUserIdOrThrow(req.user));
  }

  @Post('checkpoint/:id/check')
  @ApiOperation({ summary: 'Check answer for checkpoint by id' })
  checkCheckpoint(@Param('id') id: string, @Body('answer') answer: any) {
    return this.quizService.checkCheckpointAnswer(Number(id), answer);
  }

  @Get('checkpoint/batch')
  @ApiOperation({ summary: 'Get checkpoints by multiple lesson ids' })
  getCheckpointsByLessonIds(@Query('lessonIds') lessonIds: string) {
    const ids = lessonIds.split(',').map(id => Number(id));
    return this.quizService.getCheckpointsByLessonIds(ids);
  }
}
