import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Quiz } from './entities/quiz.entity';
import { Question } from './entities/question.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
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
  ) {}

  async createQuiz(createQuizDto: CreateQuizDto): Promise<Quiz> {
    const quiz = this.quizRepository.create({
      title: createQuizDto.title,
      description: createQuizDto.description,
      lessonId: Number(createQuizDto.lessonId),
      timeLimit: createQuizDto.timeLimit,
      passingScore: createQuizDto.passingScore,
    });

    const savedQuiz = await this.quizRepository.save(quiz);

    // Create questions if provided
    if (createQuizDto.questions && createQuizDto.questions.length > 0) {
      for (const q of createQuizDto.questions) {
        const question = this.questionRepository.create({
          ...q,
          quizId: savedQuiz.id,
        });
        await this.questionRepository.save(question);
      }
    }

    return this.findOneQuiz(savedQuiz.id);
  }

  async findAllQuizzes(lessonId?: string): Promise<Quiz[]> {
    const query = this.quizRepository
      .createQueryBuilder('quiz')
      .leftJoinAndSelect('quiz.questions', 'questions');

    if (lessonId) {
      query.where('quiz.lessonId = :lessonId', { lessonId: Number(lessonId) });
    }

    return query.getMany();
  }

  async findOneQuiz(id: string | number): Promise<Quiz> {
    const quizId = Number(id);
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId },
      relations: ['questions'],
    });
    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }
    return quiz;
  }

  async updateQuiz(id: string, updateQuizDto: UpdateQuizDto): Promise<Quiz> {
    const quiz = await this.findOneQuiz(id);
    Object.assign(quiz, updateQuizDto);
    await this.quizRepository.save(quiz);
    return this.findOneQuiz(id);
  }

  async removeQuiz(id: string): Promise<void> {
    const quiz = await this.findOneQuiz(id);
    await this.quizRepository.remove(quiz);
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

    // Calculate score
    let correctAnswers = 0;
    const totalQuestions = quiz.questions.length;

    for (const answer of submitDto.answers) {
      const question = quiz.questions.find((q) => q.id === answer.questionId);
      if (question && question.correctAnswer === answer.answer) {
        correctAnswers++;
      }
    }

    const score =
      totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const passed = score >= (quiz.passingScore || 60);

    // Find or create attempt
    let attempt = await this.attemptRepository.findOne({
      where: {
        quizId: numericQuizId,
        userId: numericUserId,
        completedAt: IsNull(),
      },
      order: { startedAt: 'DESC' },
    });

    if (!attempt) {
      attempt = this.attemptRepository.create({
        quizId: numericQuizId,
        userId: numericUserId,
        startedAt: new Date(),
      });
    }

    attempt.answers = submitDto.answers;
    attempt.score = score;
    attempt.passed = passed;
    attempt.completedAt = new Date();

    return this.attemptRepository.save(attempt);
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
            quizTitle: latestAttempt.quiz?.title,
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
  quizTitle?: string;
  passed: boolean;
  score?: number;
  completedAt?: Date;
};

export type QuizAttemptStats = {
  totalAttempts: number;
  passedAttempts: number;
  latestAttempt?: QuizAttemptInsight;
};
