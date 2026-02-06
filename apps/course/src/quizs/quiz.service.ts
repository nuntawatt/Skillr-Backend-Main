import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quizs } from './entities/quizs.entity';
import { QuizsCheckpoint } from './entities/checkpoint.entity';
import { QuizsResult, QuizsStatus } from './entities/quizs-result.entity';
import { CreateQuizsDto, CreateCheckpointDto } from './dto/create-quizs.dto';
import { Lesson } from '../lessons/entities/lesson.entity';
import { UserXp } from './entities/user-xp.entity';

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(Quizs)
    private readonly quizsRepository: Repository<Quizs>,
    @InjectRepository(QuizsCheckpoint)
    private readonly checkpointRepository: Repository<QuizsCheckpoint>,
    @InjectRepository(QuizsResult)
    private readonly resultRepository: Repository<QuizsResult>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(UserXp)
    private readonly userXpRepository: Repository<UserXp>,
  ) { }

  // --- Quizs (1 Lesson = 1 Question) ---
  async createQuizs(dto: CreateQuizsDto): Promise<Quizs> {
    const existing = await this.quizsRepository.findOne({
      where: { lessonId: dto.lesson_id },
    });
    
    const data = {
      lessonId: dto.lesson_id,
      quizsType: dto.quizs_type,
      quizsQuestions: dto.quizs_questions,
      quizsOption: dto.quizs_option,
      quizsAnswer: dto.quizs_answer,
      quizsExplanation: dto.quizs_explanation, 
    };

    if (existing) {
      Object.assign(existing, data);
      return this.quizsRepository.save(existing);
    }

    const quiz = this.quizsRepository.create(data);
    return this.quizsRepository.save(quiz);
  }

  async getQuizWithStatus(lessonId: number, userId: string) {
    const quiz = await this.quizsRepository.findOne({ where: { lessonId } });
    if (!quiz) {
      throw new NotFoundException(`Quiz for lesson ${lessonId} not found`);
    }

    const checkpoints = await this.checkpointRepository.find({ where: { lessonId } });

    const result = await this.resultRepository.findOne({
      where: { lessonId, userId },
    });

    const showAnswer = result?.status === QuizsStatus.COMPLETED;
    
    return {
      quizs_id: quiz.quizsId,
      quizs_type: quiz.quizsType,
      quizs_question: quiz.quizsQuestions,
      quizs_option: quiz.quizsOption,
      lesson_id: quiz.lessonId, 
      quizsAnswer: showAnswer ? quiz.quizsAnswer : null,
      quizsExplanation: showAnswer ? quiz.quizsExplanation : null,
      checkpoints: checkpoints.map((c) => ({
        checkpoint_id: c.checkpointId,
        checkpoint_type: c.checkpointType,
        checkpoint_questions: c.checkpointQuestions,
        checkpoint_option: c.checkpointOption ?? null,
      })),
    };
  }

  async checkAndSaveAnswer(lessonId: number, userId: string, answer: any) {
    const quiz = await this.quizsRepository.findOne({ where: { lessonId } });
    if (!quiz) throw new NotFoundException('Quiz not found');

    const isCorrect = JSON.stringify(quiz.quizsAnswer) === JSON.stringify(answer);

    let result = await this.resultRepository.findOne({ where: { lessonId, userId } });
    if (!result) {
      result = this.resultRepository.create({ lessonId, userId });
    }

    result.userAnswer = answer;
    result.isCorrect = isCorrect;
    result.status = QuizsStatus.COMPLETED;
    await this.resultRepository.save(result);

    return {
      isCorrect,
      correctAnswer: quiz.quizsAnswer,
      quizsExplanation: quiz.quizsExplanation,
    };
  }

  async skipQuiz(lessonId: number, userId: string) {
    let result = await this.resultRepository.findOne({ where: { lessonId, userId } });
    if (!result) {
      result = this.resultRepository.create({ lessonId, userId });
    }
    result.status = QuizsStatus.SKIPPED;
    return this.resultRepository.save(result);
  }

  async findAllQuizs(): Promise<Array<{ quiz_id: number; lessonId: number; quizs_type: string; quizs_question: string }>> {
    const rows = await this.quizsRepository.find();
    return rows.map((q) => ({
      quiz_id: q.quizsId,
      lessonId: q.lessonId,
      quizs_type: q.quizsType,
      quizs_question: q.quizsQuestions,
      quizs_result: q.quizsAnswer,
    }));
  }

  async findOneQuizsByLesson(lessonId: number): Promise<Quizs> {
    const quiz = await this.quizsRepository.findOne({ where: { lessonId } });
    if (!quiz) throw new NotFoundException('Quiz not found');
    return quiz;
  }

  async updateQuizs(lessonId: number, dto: Partial<CreateQuizsDto>): Promise<Quizs> {
    const quiz = await this.findOneQuizsByLesson(lessonId);
    Object.assign(quiz, {
      quizsType: dto.quizs_type ?? quiz.quizsType,
      quizsQuestions: dto.quizs_questions ?? quiz.quizsQuestions,
      quizsOption: dto.quizs_option ?? quiz.quizsOption,
      quizsAnswer: dto.quizs_answer ?? quiz.quizsAnswer,
      quizsExplanation: dto.quizs_explanation ?? quiz.quizsExplanation,
    });
    return this.quizsRepository.save(quiz);
  }

  async removeQuizs(lessonId: number): Promise<void> {
    const quiz = await this.findOneQuizsByLesson(lessonId);
    await this.quizsRepository.remove(quiz);
  }

  // --- Checkpoints ---

  async createCheckpoint(dto: CreateCheckpointDto): Promise<QuizsCheckpoint> {
    const lesson = await this.lessonRepository.findOne({
      where: { lesson_id: dto.lesson_id },
    });
    if (!lesson) {
      throw new NotFoundException(`Lesson ${dto.lesson_id} not found`);
    }

    // Prevent duplicates: treat checkpoint as 1-per-lesson (upsert by lessonId)
    const existing = await this.checkpointRepository.findOne({
      where: { lessonId: dto.lesson_id },
      order: { checkpointId: 'DESC' },
    });

    const data = {
      lessonId: dto.lesson_id,
      checkpointType: dto.checkpoint_type,
      checkpointQuestions: dto.checkpoint_questions,
      checkpointOption: dto.checkpoint_option,
      checkpointAnswer: dto.checkpoint_answer,
    };

    if (existing) {
      Object.assign(existing, data);
      return this.checkpointRepository.save(existing);
    }

    const checkpoint = this.checkpointRepository.create(data);
    return this.checkpointRepository.save(checkpoint);
  }

  async findCheckpointsByLesson(
    lessonId: number,
  ): Promise<Array<{ id: number; lessonId: number; type: string; question: string; options?: string[] | null }>> {
    const rows = await this.checkpointRepository.find({ where: { lessonId } });
    return rows.map((c) => ({
      id: c.checkpointId,
      lessonId: c.lessonId,
      type: c.checkpointType,
      question: c.checkpointQuestions,
      options: c.checkpointOption ?? null,
    }));
  }

  async checkCheckpointAnswer(checkpointId: number, userId: string, answer: any) {
    const checkpoint = await this.checkpointRepository.findOne({ where: { checkpointId } });
    if (!checkpoint) throw new NotFoundException('Checkpoint not found');
    const isCorrect = JSON.stringify(checkpoint.checkpointAnswer) === JSON.stringify(answer);
    const score = isCorrect ? 5 : 0;

    const lesson = await this.lessonRepository.findOne({
      where: { lesson_id: checkpoint.lessonId },
    });

    // If the lesson row is missing, still return correctness without XP.
    if (!lesson) {
      return {
        checkpointId: checkpoint.checkpointId,
        lessonId: checkpoint.lessonId,
        chapterId: null,
        isCorrect,
        score,
        correctAnswer: checkpoint.checkpointAnswer,
        feedback: isCorrect
          ? 'ผ่านแล้ว แต่ไม่สามารถให้ XP ได้ (ไม่พบ lesson/chapter ของ checkpoint นี้)'
          : 'ตอบผิด ลองใหม่อีกครั้ง',
        checkpointStatus: 'PENDING',
      };
    }

    const chapterId = lesson.chapter_id;

    let userXp = await this.userXpRepository.findOne({
      where: { userId, chapterId },
    });

    if (!userXp) {
      userXp = this.userXpRepository.create({
        userId,
        chapterId,
        xpEarned: 0,
        checkpointStatus: 'PENDING',
        completedAt: null,
        lastAttemptAt: null,
      });
    }

    const wasXpAlreadyEarned = userXp.xpEarned > 0;
    const xpEarned = isCorrect && !wasXpAlreadyEarned ? 5 : 0;

    userXp.lastAttemptAt = new Date();

    if (isCorrect) {
      userXp.checkpointStatus = 'COMPLETED';
      userXp.completedAt = new Date();
      if (!wasXpAlreadyEarned) {
        userXp.xpEarned = xpEarned;
      }
    }

    userXp = await this.userXpRepository.save(userXp);

    return {
      checkpointId: checkpoint.checkpointId,
      lessonId: checkpoint.lessonId,
      chapterId,
      isCorrect,
      score,
      correctAnswer: checkpoint.checkpointAnswer,
      feedback: isCorrect ? 'ผ่านแล้ว' : 'ตอบผิด ลองใหม่อีกครั้ง',
      checkpointStatus: userXp.checkpointStatus,
    };
  }
}
