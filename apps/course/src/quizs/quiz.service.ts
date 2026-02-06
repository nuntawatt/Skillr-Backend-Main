import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quizs } from './entities/quizs.entity';
import { QuizsCheckpoint } from './entities/checkpoint.entity';
import { QuizsResult, QuizsStatus } from './entities/quizs-result.entity';
import { CreateQuizsDto, CreateCheckpointDto } from './dto/create-quizs.dto';

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(Quizs)
    private readonly quizsRepository: Repository<Quizs>,
    @InjectRepository(QuizsCheckpoint)
    private readonly checkpointRepository: Repository<QuizsCheckpoint>,
    @InjectRepository(QuizsResult)
    private readonly resultRepository: Repository<QuizsResult>,
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

  async getQuizWithStatus(lessonId: number, userId: number) {
    const quiz = await this.quizsRepository.findOne({ where: { lessonId } });
    if (!quiz) {
      throw new NotFoundException(`Quiz for lesson ${lessonId} not found`);
    }

    const result = await this.resultRepository.findOne({
      where: { lessonId, userId },
    });

    const showAnswer = result?.status === QuizsStatus.COMPLETED;
    
    return {
      id: quiz.quizsId,
      type: quiz.quizsType,
      question: quiz.quizsQuestions,
      options: quiz.quizsOption,
      lessonId: quiz.lessonId,
      result: result
        ? {
            answer: result.userAnswer,
            correct: result.isCorrect,
            status: result.status,
          }
        : { status: QuizsStatus.NOT_STARTED },
      answer: showAnswer ? quiz.quizsAnswer : undefined,
      explanation: showAnswer ? quiz.quizsExplanation : undefined,
    };
  }

  async checkAndSaveAnswer(lessonId: number, userId: number, answer: any) {
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
      explanation: quiz.quizsExplanation,
    };
  }

  async skipQuiz(lessonId: number, userId: number) {
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
    const checkpoint = this.checkpointRepository.create({
      lessonId: dto.lesson_id,
      checkpointType: dto.checkpoint_type,
      checkpointQuestions: dto.checkpoint_questions,
      checkpointOption: dto.checkpoint_option,
      checkpointAnswer: dto.checkpoint_answer,
    });
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

  async checkCheckpointAnswer(checkpointId: number, answer: any) {
    const checkpoint = await this.checkpointRepository.findOne({ where: { checkpointId } });
    if (!checkpoint) throw new NotFoundException('Checkpoint not found');
    const isCorrect = JSON.stringify(checkpoint.checkpointAnswer) === JSON.stringify(answer);
    return {
      isCorrect,
      correctAnswer: checkpoint.checkpointAnswer,
    };
  }
}
