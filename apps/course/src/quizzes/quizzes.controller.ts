import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
  ApiQuery,
  ApiNoContentResponse,
  ApiResponse,
} from '@nestjs/swagger';
import { QuizzesService } from './quizzes.service';
import {
  CreateQuizDto,
  UpdateQuizDto,
  QuizResponseDto,
  QuizSubmissionDto,
  QuizResultDto,
} from './dto/quiz.dto';

@ApiTags('Quizzes')
@Controller('quizzes')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new quiz' })
  @ApiCreatedResponse({
    type: QuizResponseDto,
    description: 'Quiz created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  create(@Body() createQuizDto: CreateQuizDto): Promise<QuizResponseDto> {
    return this.quizzesService.create(createQuizDto);
  }

  @Post('lesson')
  @ApiOperation({ summary: 'Create a new quiz lesson with questions' })
  @ApiCreatedResponse({
    type: QuizResponseDto,
    description: 'Quiz lesson created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  createQuizLesson(
    @Body() createQuizDto: CreateQuizDto,
  ): Promise<QuizResponseDto> {
    return this.quizzesService.create(createQuizDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all quizzes for a lesson' })
  @ApiQuery({
    name: 'lessonId',
    required: true,
    type: Number,
    description: 'ID of the lesson to fetch quizzes for',
  })
  @ApiOkResponse({ type: QuizResponseDto, isArray: true })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  findByLesson(
    @Query('lessonId', ParseIntPipe) lessonId: number,
  ): Promise<QuizResponseDto[]> {
    return this.quizzesService.findByLesson(lessonId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a quiz by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: QuizResponseDto })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<QuizResponseDto> {
    return this.quizzesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a quiz by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: QuizResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateQuizDto: UpdateQuizDto,
  ): Promise<QuizResponseDto> {
    return this.quizzesService.update(id, updateQuizDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a quiz by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiNoContentResponse({ description: 'Quiz deleted successfully' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.quizzesService.remove(id);
  }

  @Post(':id/submit')
  @ApiOperation({
    summary: 'Submit quiz answers and get results with immediate feedback',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiCreatedResponse({
    type: QuizResultDto,
    description: 'Quiz submitted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Quiz not active or invalid answers',
  })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  submitQuiz(
    @Param('id', ParseIntPipe) id: number,
    @Body() submission: QuizSubmissionDto,
  ): Promise<QuizResultDto> {
    return this.quizzesService.submitQuiz(id, submission);
  }
}
