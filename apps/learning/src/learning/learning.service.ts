import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Quiz } from './entities/quiz.entity';
import { Question, QuestionType } from './entities/question.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { LearningProgressService } from './learning-progress.service';
import { CreateQuestionDto, CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';

@Injectable()
export class LearningService {
  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(QuizAttempt)
    private readonly attemptRepository: Repository<QuizAttempt>,
    private readonly learningProgressService: LearningProgressService,
  ) {}

  async createQuiz(createQuizDto: CreateQuizDto): Promise<Quiz> {
    const questions: CreateQuestionDto[] = createQuizDto.questions ?? [];

    if (questions.length > 3) {
      throw new BadRequestException('1 Lesson สามารถมี Quiz ได้สูงสุด 3 ข้อ');
    }

    const quiz = this.quizRepository.create({
      description: createQuizDto.description,
      lessonId: Number(createQuizDto.lessonId),
    });

    const savedQuiz = await this.quizRepository.save(quiz);

    // Create questions if provided
    if (questions.length > 0) {
      for (const [index, q] of questions.entries()) {
        const question = this.questionRepository.create({
          question: q.question,
          type: q.type ?? QuestionType.MULTIPLE_CHOICE,
          options: this.mapOptionsByType(q),
          correctAnswer: this.mapCorrectAnswerByType(q),
          explanation: q.explanation,
          points: q.points,
          order: index + 1, // บังคับเรียงลำดับบนลงล่าง
          quizId: savedQuiz.id,
        });
        await this.questionRepository.save(question);
      }
    }

    return this.findOneQuiz(savedQuiz.id);
  }

  private mapOptionsByType(question: CreateQuestionDto) {
    switch (question.type) {
      case QuestionType.MATCH_PAIRS:
        return question.optionsPairs;
      case QuestionType.CORRECT_ORDER:
        return question.optionsOrder;
      default:
        return question.options;
    }
  }

  private mapCorrectAnswerByType(question: CreateQuestionDto) {
    switch (question.type) {
      case QuestionType.TRUE_FALSE:
        return question.correctAnswerBool;
      case QuestionType.MATCH_PAIRS:
        // ถ้าไม่ส่งเฉลยมา ให้ใช้ optionsPairs เป็นเฉลยไปเลย
        return question.correctAnswerPairs ?? question.optionsPairs;
      case QuestionType.CORRECT_ORDER:
        // ใช้ลำดับของ optionsOrder ที่ส่งมาเป็นเฉลยโดยตรง (เก็บเป็น Array ของ Text)
        return question.optionsOrder?.map((o) => o.text);
      default:
        return question.correctAnswer;
    }
  }

  async findAllQuizzes(lessonId?: string): Promise<Quiz[]> {
    const query = this.quizRepository
      .createQueryBuilder('quiz')
      .leftJoinAndSelect('quiz.questions', 'questions')
      .addOrderBy('questions.order', 'ASC');

    if (lessonId) {
      query.where('quiz.lessonId = :lessonId', { lessonId: Number(lessonId) });
    }

    return query.getMany();
  }

  async findOneQuiz(id: string | number): Promise<Quiz> {
    const quizId = Number(id);
    const quiz = await this.quizRepository
      .createQueryBuilder('quiz')
      .leftJoinAndSelect('quiz.questions', 'questions')
      .where('quiz.id = :id', { id: quizId })
      .orderBy('questions.order', 'ASC')
      .getOne();

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }
    return quiz;
  }

  /**
   * Stips correct answers from quiz questions for students.
   */
  stripAnswers(quiz: Quiz): Quiz {
    if (quiz.questions) {
      quiz.questions = quiz.questions.map((q) => {
        const { correctAnswer, ...rest } = q;
        return rest as Question;
      });
    }
    return quiz;
  }

  async updateQuiz(id: string, updateQuizDto: UpdateQuizDto): Promise<Quiz> {
    if (updateQuizDto.questions && updateQuizDto.questions.length > 3) {
      throw new BadRequestException('1 Lesson สามารถมี Quiz ได้สูงสุด 3 ข้อ');
    }

    const quiz = await this.findOneQuiz(id);
    Object.assign(quiz, updateQuizDto);
    await this.quizRepository.save(quiz);
    return this.findOneQuiz(id);
  }

  async updateQuestion(
    id: number,
    updateDto: UpdateQuestionDto,
  ): Promise<Question> {
    const question = await this.questionRepository.findOne({ where: { id } });
    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // Handle options and correct answer mapping if they are being updated
    const mappedOptions =
      updateDto.type ||
      updateDto.options ||
      updateDto.optionsPairs ||
      updateDto.optionsOrder
        ? this.mapOptionsByType(updateDto as any)
        : question.options;

    const mappedAnswer =
      updateDto.type ||
      updateDto.correctAnswer ||
      updateDto.correctAnswerBool ||
      updateDto.correctAnswerPairs
        ? this.mapCorrectAnswerByType(updateDto as any)
        : question.correctAnswer;

    Object.assign(question, {
      ...updateDto,
      options: mappedOptions,
      correctAnswer: mappedAnswer,
    });

    return await this.questionRepository.save(question);
  }

  async removeQuiz(id: string): Promise<void> {
    const quiz = await this.findOneQuiz(id);
    await this.quizRepository.remove(quiz);
  }

  async removeQuestion(id: number): Promise<void> {
    const question = await this.questionRepository.findOne({
      where: { id },
    });
    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const quizId = question.quizId;
    await this.questionRepository.remove(question);

    // Re-index remaining questions in order
    const remaining = await this.questionRepository.find({
      where: { quizId },
      order: { order: 'ASC' },
    });

    for (let i = 0; i < remaining.length; i++) {
      const q = remaining[i];
      const newOrder = i + 1;
      if (q.order !== newOrder) {
        q.order = newOrder;
        await this.questionRepository.save(q);
      }
    }
  }

  async startQuiz(quizId: string, userId: string): Promise<QuizAttempt> {
    const quiz = await this.findOneQuiz(quizId);
    const numericUserId = Number(userId);

    const attempt = this.attemptRepository.create({
      quizId: quiz.id,
      userId: numericUserId,
      startedAt: new Date(),
    });

    return this.attemptRepository.save(attempt);
  }

  async submitQuiz(
    quizId: string,
    userId: string,
    submitDto: SubmitQuizDto,
  ): Promise<QuizAttempt> {
    const quiz = await this.findOneQuiz(quizId);
    const numericQuizId = Number(quizId);
    const numericUserId = Number(userId);

    // 1. Find the active attempt
    let attempt = await this.attemptRepository.findOne({
      where: {
        quizId: numericQuizId,
        userId: numericUserId,
        completedAt: IsNull(),
      },
      order: { startedAt: 'DESC' },
    });

    if (!attempt) {
      // If no active attempt, create one (or throw if you prefer strict flow)
      attempt = this.attemptRepository.create({
        quizId: numericQuizId,
        userId: numericUserId,
        startedAt: new Date(),
      });
    }

    // 2. Calculate score and validate questions
    let correctAnswers = 0;
    const totalQuestions = quiz.questions.length;
    const results: { questionId: number; isCorrect: boolean }[] = [];

    for (const answer of submitDto.answers) {
      const question = quiz.questions.find((q) => q.id === answer.questionId);
      if (!question) {
        throw new BadRequestException(
          `Question ID ${answer.questionId} does not belong to this quiz`,
        );
      }

      const isCorrect = this.isAnswerCorrect(question, answer.answer);
      results.push({ questionId: answer.questionId, isCorrect });
      if (isCorrect) {
        correctAnswers++;
      }
    }

    const score =
      totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const passed = score >= 60; // Default passing score is now 60%

    // 3. Update and save attempt
    attempt.answers = submitDto.answers;
    attempt.results = results;
    attempt.score = score;
    attempt.passed = passed;
    attempt.completedAt = new Date();

    const savedAttempt = await this.attemptRepository.save(attempt);

    // 4. Auto-update Lesson Progress if passed
    if (passed) {
      await this.learningProgressService.completeLesson(
        userId,
        String(quiz.lessonId),
      );
    }

    return savedAttempt;
  }

  private isAnswerCorrect(question: Question, submittedAnswer: any): boolean {
    const correct = question.correctAnswer;

    switch (question.type) {
      case QuestionType.MULTIPLE_CHOICE:
        return String(correct) === String(submittedAnswer);

      case QuestionType.TRUE_FALSE:
        return (
          String(correct).toLowerCase() ===
          String(submittedAnswer).toLowerCase()
        );

      case QuestionType.MATCH_PAIRS: {
        if (!Array.isArray(correct) || !Array.isArray(submittedAnswer)) {
          return false;
        }

        const normalizedCorrect = this.normalizePairs(correct);
        const normalizedSubmitted = this.normalizePairs(submittedAnswer);

        if (
          !normalizedCorrect ||
          !normalizedSubmitted ||
          normalizedCorrect.length !== normalizedSubmitted.length
        ) {
          return false;
        }

        const sortFn = (a: any, b: any) =>
          String(a.left).localeCompare(String(b.left));
        normalizedCorrect.sort(sortFn);
        normalizedSubmitted.sort(sortFn);

        return (
          JSON.stringify(normalizedCorrect) ===
          JSON.stringify(normalizedSubmitted)
        );
      }

      case QuestionType.CORRECT_ORDER:
        // For complex types, we compare as JSON strings (order-sensitive for Correct Order)
        return JSON.stringify(correct) === JSON.stringify(submittedAnswer);

      default:
        return correct === submittedAnswer;
    }
  }

  /**
   * Normalize matching pairs for comparison:
   * - require left/right keys
   * - trim + lowercase to avoid casing/spacing issues
   */
  private normalizePairs(
    pairs: any[],
  ): { left: string; right: string }[] | null {
    try {
      return pairs.map((p) => {
        if (p === null || p === undefined) {
          throw new Error('Invalid pair');
        }
        if (p.left === undefined || p.right === undefined) {
          throw new Error('Pair must include left and right');
        }
        const left = String(p.left).trim().toLowerCase();
        const right = String(p.right).trim().toLowerCase();
        if (left === '' || right === '') {
          throw new Error('Pair values cannot be empty');
        }
        return { left, right };
      });
    } catch {
      return null;
    }
  }

  async getAttempts(quizId: string, userId: string): Promise<QuizAttempt[]> {
    const numericQuizId = Number(quizId);
    const numericUserId = Number(userId);
    return this.attemptRepository.find({
      where: { quizId: numericQuizId, userId: numericUserId },
      order: { startedAt: 'DESC' },
    });
  }

  async getUserAttemptStats(userId: string): Promise<QuizAttemptStats> {
    const numericUserId = Number(userId);
    const [totalAttempts, passedAttempts, latestAttempt] = await Promise.all([
      this.attemptRepository.count({
        where: { userId: numericUserId },
      }),
      this.attemptRepository.count({
        where: { userId: numericUserId, passed: true },
      }),
      this.attemptRepository.findOne({
        where: { userId: numericUserId },
        order: { completedAt: 'DESC' },
        relations: ['quiz'],
      }),
    ]);

    return {
      totalAttempts,
      passedAttempts,
      latestAttempt: latestAttempt
        ? {
            quizId: latestAttempt.quizId,
            score: latestAttempt.score ?? undefined,
            passed: Boolean(latestAttempt.passed),
            completedAt: latestAttempt.completedAt,
          }
        : undefined,
    };
  }
}

export type QuizAttemptInsight = {
  quizId: number;
  passed: boolean;
  score?: number;
  completedAt?: Date;
};

export type QuizAttemptStats = {
  totalAttempts: number;
  passedAttempts: number;
  latestAttempt?: QuizAttemptInsight;
};
