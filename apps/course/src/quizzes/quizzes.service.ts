import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quiz, QuizType, QuizStatus } from './entities/quiz.entity';
import { Lesson } from '../lessons/entities/lesson.entity';
import {
  CreateQuizDto,
  UpdateQuizDto,
  QuizResponseDto,
  QuizSubmissionDto,
  QuizResultDto,
  QuizQuestionResultDto,
} from './dto/quiz.dto';

@Injectable()
export class QuizzesService {
  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
  ) {}

  async create(createQuizDto: CreateQuizDto): Promise<QuizResponseDto> {
    // Verify lesson exists
    const lesson = await this.lessonRepository.findOne({
      where: { lesson_id: createQuizDto.lesson_id },
    });

    if (!lesson) {
      throw new NotFoundException(
        `Lesson with ID ${createQuizDto.lesson_id} not found`,
      );
    }

    // Generate question IDs and validate questions
    const quizQuestions = createQuizDto.quiz_questions.map((q, index) => ({
      id: `q_${Date.now()}_${index}`,
      question: q.question,
      type: q.type,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      order_index: q.order_index,
    }));

    // Validate quiz questions based on type
    this.validateQuizQuestions(quizQuestions);

    const quiz = this.quizRepository.create({
      ...createQuizDto,
      quiz_questions: quizQuestions,
      quiz_status: createQuizDto.quiz_status || QuizStatus.ACTIVE,
    });

    const savedQuiz = await this.quizRepository.save(quiz);
    return this.mapToResponseDto(savedQuiz);
  }

  async findByLesson(lessonId: number): Promise<QuizResponseDto[]> {
    const quizzes = await this.quizRepository.find({
      where: { lesson_id: lessonId },
      order: { createdAt: 'ASC' },
    });

    return quizzes.map((quiz) => this.mapToResponseDto(quiz));
  }

  async findOne(id: number): Promise<QuizResponseDto> {
    const quiz = await this.quizRepository.findOne({
      where: { quiz_id: id },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }

    return this.mapToResponseDto(quiz);
  }

  async update(
    id: number,
    updateQuizDto: UpdateQuizDto,
  ): Promise<QuizResponseDto> {
    const quiz = await this.quizRepository.findOne({
      where: { quiz_id: id },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }

    // If questions are being updated, validate them
    if (updateQuizDto.quiz_questions) {
      const quizQuestions = updateQuizDto.quiz_questions.map((q, index) => ({
        id: `q_${Date.now()}_${index}`,
        question: q.question,
        type: q.type,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        order_index: q.order_index,
      }));

      this.validateQuizQuestions(quizQuestions);
      updateQuizDto.quiz_questions = quizQuestions as any;
    }

    Object.assign(quiz, updateQuizDto);
    const updatedQuiz = await this.quizRepository.save(quiz);
    return this.mapToResponseDto(updatedQuiz);
  }

  async remove(id: number): Promise<void> {
    const quiz = await this.quizRepository.findOne({
      where: { quiz_id: id },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }

    await this.quizRepository.remove(quiz);
  }

  async submitQuiz(
    quizId: number,
    submission: QuizSubmissionDto,
  ): Promise<QuizResultDto> {
    const quiz = await this.quizRepository.findOne({
      where: { quiz_id: quizId },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }

    if (quiz.quiz_status !== QuizStatus.ACTIVE) {
      throw new BadRequestException('Quiz is not active');
    }

    const questionResults: QuizQuestionResultDto[] = [];
    let correctAnswers = 0;

    for (const question of quiz.quiz_questions) {
      const userAnswer = submission.answers.find(
        (a) => a.question_id === question.id,
      );

      if (!userAnswer) {
        throw new BadRequestException(
          `Answer not found for question ${question.id}`,
        );
      }

      const isCorrect = this.checkAnswer(question, userAnswer.answer);
      if (isCorrect) {
        correctAnswers++;
      }

      const result: QuizQuestionResultDto = {
        question_id: question.id,
        question: question.question,
        user_answer: userAnswer.answer,
        correct_answer: question.correct_answer,
        is_correct: isCorrect,
        explanation: quiz.show_immediate_feedback
          ? question.explanation
          : undefined,
      };

      questionResults.push(result);
    }

    const totalQuestions = quiz.quiz_questions.length;
    const score = Math.round((correctAnswers / totalQuestions) * 100);
    const passed = score >= quiz.passing_score;

    return {
      total_questions: totalQuestions,
      correct_answers: correctAnswers,
      score,
      passed,
      question_results: questionResults,
    };
  }

  private validateQuizQuestions(questions: any[]): void {
    for (const question of questions) {
      if (question.type === QuizType.MULTIPLE_CHOICE) {
        if (!question.options || question.options.length < 2) {
          throw new BadRequestException(
            'Multiple choice questions must have at least 2 options',
          );
        }
        if (!question.options.includes(question.correct_answer)) {
          throw new BadRequestException(
            'Correct answer must be one of the options',
          );
        }
      } else if (question.type === QuizType.TRUE_FALSE) {
        if (typeof question.correct_answer !== 'boolean') {
          throw new BadRequestException(
            'True/False questions must have a boolean correct answer',
          );
        }
      }
    }
  }

  private checkAnswer(question: any, userAnswer: string | boolean): boolean {
    if (question.type === QuizType.MULTIPLE_CHOICE) {
      return userAnswer === question.correct_answer;
    } else if (question.type === QuizType.TRUE_FALSE) {
      return userAnswer === question.correct_answer;
    }
    return false;
  }

  private mapToResponseDto(quiz: Quiz): QuizResponseDto {
    return {
      quiz_id: quiz.quiz_id,
      quiz_title: quiz.quiz_title,
      quiz_description: quiz.quiz_description,
      quiz_type: quiz.quiz_type,
      quiz_status: quiz.quiz_status,
      quiz_questions: quiz.quiz_questions,
      show_immediate_feedback: quiz.show_immediate_feedback,
      allow_retry: quiz.allow_retry,
      time_limit: quiz.time_limit,
      passing_score: quiz.passing_score,
      lesson_id: quiz.lesson_id,
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
    };
  }
}
