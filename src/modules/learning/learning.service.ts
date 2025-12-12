import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
      lessonId: createQuizDto.lessonId,
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
    const query = this.quizRepository.createQueryBuilder('quiz')
      .leftJoinAndSelect('quiz.questions', 'questions')
      .leftJoinAndSelect('quiz.lesson', 'lesson');
    
    if (lessonId) {
      query.where('quiz.lessonId = :lessonId', { lessonId });
    }
    
    return query.getMany();
  }

  async findOneQuiz(id: string): Promise<Quiz> {
    const quiz = await this.quizRepository.findOne({
      where: { id },
      relations: ['questions', 'lesson'],
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
    
    const attempt = this.attemptRepository.create({
      quizId: quiz.id,
      userId,
      startedAt: new Date(),
    });
    
    return this.attemptRepository.save(attempt);
  }

  async submitQuiz(quizId: string, userId: string, submitDto: SubmitQuizDto): Promise<QuizAttempt> {
    const quiz = await this.findOneQuiz(quizId);
    
    // Calculate score
    let correctAnswers = 0;
    const totalQuestions = quiz.questions.length;
    
    for (const answer of submitDto.answers) {
      const question = quiz.questions.find(q => q.id === answer.questionId);
      if (question && question.correctAnswer === answer.answer) {
        correctAnswers++;
      }
    }
    
    const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const passed = score >= (quiz.passingScore || 60);
    
    // Find or create attempt
    let attempt = await this.attemptRepository.findOne({
      where: { quizId, userId, completedAt: undefined as any },
      order: { startedAt: 'DESC' },
    });
    
    if (!attempt) {
      attempt = this.attemptRepository.create({
        quizId,
        userId,
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
    return this.attemptRepository.find({
      where: { quizId, userId },
      order: { startedAt: 'DESC' },
    });
  }
}
