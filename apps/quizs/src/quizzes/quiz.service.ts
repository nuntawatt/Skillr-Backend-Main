import { BadRequestException, Injectable, NotFoundException, } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Quiz } from './entities/quiz.entity';
import { Question, QuestionType } from './entities/question.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { CreateQuestionDto, CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuizSolutionResponseDto } from './dto/quiz-solution.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { Quizs } from './entities/quizs.entity';
import { QuizsCheckpoint } from './entities/checkpoint.entity';
import { CreateQuizsDto, CreateCheckpointDto } from './dto/create-quizs.dto';

@Injectable()
export class QuizService {
  private readonly maxQuestionsPerLesson = 1; // Updated to 1 as per user request
  private readonly learningServiceUrl = process.env.LEARNING_SERVICE_URL;

  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(QuizAttempt)
    private readonly attemptRepository: Repository<QuizAttempt>,
    @InjectRepository(Quizs)
    private readonly quizsRepository: Repository<Quizs>,
    @InjectRepository(QuizsCheckpoint)
    private readonly checkpointRepository: Repository<QuizsCheckpoint>,
    private readonly httpService: HttpService,
  ) { }

  // --- New Flattened Methods ---

  async createQuizs(dto: CreateQuizsDto): Promise<Quizs> {
    const existing = await this.quizsRepository.findOne({
      where: { lessonId: dto.lesson_id },
    });
    if (existing) {
      throw new BadRequestException(`Lesson ${dto.lesson_id} มี Quiz อยู่แล้ว`);
    }

    const quiz = this.quizsRepository.create({
      lessonId: dto.lesson_id,
      quizsType: dto.quizs_type,
      quizsQuestions: dto.quizs_questions,
      quizsOption: dto.quizs_option,
      quizsAnswer: dto.quizs_answer,
    });
    return this.quizsRepository.save(quiz);
  }

  async findOneQuizsByLesson(lessonId: number): Promise<Quizs> {
    const quiz = await this.quizsRepository.findOne({ where: { lessonId } });
    if (!quiz) {
      throw new NotFoundException(`Quiz for lesson ${lessonId} not found`);
    }
    return quiz;
  }

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

  async findCheckpointsByLesson(lessonId: number): Promise<QuizsCheckpoint[]> {
    return this.checkpointRepository.find({ where: { lessonId } });
  }

  async checkQuizsAnswer(lessonId: number, answer: any) {
    const quiz = await this.findOneQuizsByLesson(lessonId);
    const isCorrect = JSON.stringify(quiz.quizsAnswer) === JSON.stringify(answer);
    return {
      isCorrect,
      correctAnswer: quiz.quizsAnswer,
    };
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

  // --- End of New Flattened Methods ---

  async createQuiz(createQuizDto: CreateQuizDto): Promise<Quiz> {
    const questions: CreateQuestionDto[] = createQuizDto.questions ?? [];

    // Business Rule: 1 Lesson มีได้แค่ 1 Quiz
    const existingQuizForLesson = await this.quizRepository.findOne({
      where: { lessonId: Number(createQuizDto.lessonId) },
    });
    if (existingQuizForLesson) {
      throw new BadRequestException(
        `Lesson ${createQuizDto.lessonId} มี Quiz อยู่แล้ว (Quiz ID: ${existingQuizForLesson.id})`,
      );
    }

    // Check total questions for this lesson in DB
    const existingQuizzes = await this.quizRepository.find({
      where: { lessonId: Number(createQuizDto.lessonId) },
      relations: ['questions'],
    });

    const totalExistingQuestions = existingQuizzes.reduce(
      (sum, q) => sum + (q.questions?.length ?? 0),
      0,
    );

    if (totalExistingQuestions + questions.length > this.maxQuestionsPerLesson) {
      throw new BadRequestException(
        `1 Lesson สามารถมีคำถามรวมได้สูงสุด ${this.maxQuestionsPerLesson} ข้อ (ปัจจุบันมีแล้ว ${totalExistingQuestions} ข้อ)`,
      );
    }

    const quiz = this.quizRepository.create({
      lessonId: Number(createQuizDto.lessonId),
      title: createQuizDto.title,
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
          mediaUrl: q.mediaUrl,
          points: 1, // backend-managed points
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
      case QuestionType.TRUE_FALSE:
        return ['True', 'False'];
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
        return question.optionsPairs;
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
   * Stips correct answers from quiz questions for students and SHUFFLES options for challenge.
   */
  async stripAnswers(quiz: Quiz, userId?: string): Promise<Quiz> {
    let activeAttempt: QuizAttempt | null = null;
    if (userId) {
      activeAttempt = await this.attemptRepository.findOne({
        where: {
          quizId: quiz.id,
          userId: Number(userId),
          completedAt: IsNull(),
        },
        order: { startedAt: 'DESC' },
      });
    }

    if (quiz.questions) {
      quiz.questions = quiz.questions.map((q) => {
        const { correctAnswer, ...rest } = q;
        const stripped = { ...rest } as Question;

        // Ensure TRUE_FALSE always has options ['True', 'False'] (Derived for students)
        if (q.type === QuestionType.TRUE_FALSE) {
          stripped.options = ['True', 'False'];
        }

        // --- Persist Presentation Order Logic ---
        const hasAnswered = activeAttempt?.answers?.some(
          (a) => a.questionId === q.id,
        );
        const savedOrder = activeAttempt?.shuffledOrders?.[q.id];

        // ถ้ามีการตอบแล้ว และเคยเซฟลำดับไว้ -> ใช้ลำดับเดิม (จะไม่สุ่มซ้ำ)
        if (hasAnswered && savedOrder) {
          stripped.options = savedOrder;
        } else if (stripped.options && Array.isArray(stripped.options)) {
          // ถ้ายังไม่ตอบ หรือยังไม่เคยเซฟลำดับ -> สุ่มใหม่
          if (q.type === QuestionType.MULTIPLE_CHOICE) {
            // สลับตัวเลือก ก ข ค ง
            stripped.options = this.shuffleArray([
              ...(stripped.options as string[]),
            ]);
          } else if (q.type === QuestionType.CORRECT_ORDER) {
            // สลับขั้นตอนการเรียงลำดับให้มั่ว
            stripped.options = this.shuffleArray([...(stripped.options as any[])]);
          } else if (q.type === QuestionType.MATCH_PAIRS) {
            // ตามโจทย์: ฝั่งขวาอยู่ที่เดิม แต่ฝั่งซ้ายสุ่มลำดับใหม่
            const pairs = stripped.options as { left: string; right: string }[];
            const shuffledLefts = this.shuffleArray(pairs.map((p) => p.left));
            const originalRights = pairs.map((p) => p.right);

            stripped.options = originalRights.map((right, i) => ({
              left: shuffledLefts[i],
              right: right,
            }));
          }

          // อัปเดตลำดับที่สุ่มได้กลับเข้าไปใน Attempt (Draft) เพื่อให้ครั้งหน้าเรียกแล้วได้ลำดับเดิมถ้ามีการเซฟ
          if (activeAttempt) {
            if (!activeAttempt.shuffledOrders) activeAttempt.shuffledOrders = {};
            activeAttempt.shuffledOrders[q.id] = stripped.options as any[];
          }
        }
        // ------------------------------------

        return stripped;
      });

      // เซฟลำดับที่สุ่มได้ลง Attempt ถ้ามี (เพื่อให้คงที่แม้ยังไม่กด save-progress)
      if (activeAttempt) {
        activeAttempt.shuffledOrders = { ...activeAttempt.shuffledOrders };
        await this.attemptRepository.save(activeAttempt);
      }
    }
    return quiz;
  }

  /**
   * Helper to shuffle an array using Fisher-Yates algorithm.
   */
  private shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  async updateQuiz(id: string, updateQuizDto: UpdateQuizDto): Promise<Quiz> {
    const quiz = await this.findOneQuiz(id);

    // Business Rule: 1 Lesson มีได้แค่ 1 Quiz
    // - ถ้ามีการเปลี่ยน lessonId ต้องตรวจว่ามี quiz ของ lesson นั้นอยู่แล้วหรือไม่
    if (
      updateQuizDto.lessonId !== undefined &&
      Number(updateQuizDto.lessonId) !== Number(quiz.lessonId)
    ) {
      const exists = await this.quizRepository.findOne({
        where: { lessonId: Number(updateQuizDto.lessonId) },
      });
      if (exists && exists.id !== quiz.id) {
        throw new BadRequestException(
          `Lesson ${updateQuizDto.lessonId} มี Quiz อยู่แล้ว (Quiz ID: ${exists.id})`,
        );
      }
    }

    // Enforce total questions per lesson (across quizzes) when questions are being replaced/updated
    if (updateQuizDto.questions) {
      const targetLessonId =
        typeof updateQuizDto.lessonId === 'number'
          ? updateQuizDto.lessonId
          : quiz.lessonId;

      const existingQuizzes = await this.quizRepository.find({
        where: { lessonId: Number(targetLessonId) },
        relations: ['questions'],
      });

      const totalOtherQuestions = existingQuizzes.reduce((sum, q) => {
        if (q.id === quiz.id) {
          return sum;
        }
        return sum + (q.questions?.length ?? 0);
      }, 0);

      const nextTotal = totalOtherQuestions + updateQuizDto.questions.length;
      if (nextTotal > this.maxQuestionsPerLesson) {
        throw new BadRequestException(
          `1 Lesson สามารถมีคำถามรวมได้สูงสุด ${this.maxQuestionsPerLesson} ข้อ (ปัจจุบันมีแล้ว ${totalOtherQuestions} ข้อ)`,
        );
      }
    }

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
        updateDto.optionsPairs
        ? this.mapCorrectAnswerByType(updateDto as any)
        : question.correctAnswer;

    Object.assign(question, {
      ...updateDto,
      options: mappedOptions,
      correctAnswer: mappedAnswer,
      explanation: updateDto.explanation ?? question.explanation,
      mediaUrl: updateDto.mediaUrl ?? question.mediaUrl,
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

  async startQuiz(
    quizId: string,
    userId: string,
    options?: { retry?: boolean },
  ): Promise<QuizAttempt> {
    const quiz = await this.findOneQuiz(quizId);
    const numericQuizId = Number(quizId);
    const numericUserId = Number(userId);
    const isRetry = Boolean(options?.retry);

    // User Story: ผู้เรียนสามารถกลับมาทำ Quiz ซ้ำได้
    // - หากไม่ได้ส่ง retry: ให้ทำได้ในโหมด review ผ่าน /solution (ไม่ต้อง start ใหม่)
    // - หากส่ง retry: ให้เปิด attempt ใหม่

    // 2. เช็คว่ามี Attempt ที่ทำค้างอยู่ไหม
    const activeAttempt = await this.attemptRepository.findOne({
      where: {
        quizId: numericQuizId,
        userId: numericUserId,
        completedAt: IsNull(),
      },
      order: { startedAt: 'DESC' },
    });

    if (activeAttempt && !isRetry) {
      return activeAttempt; // ส่งอันเดิมกลับไปให้ทำต่อ
    }

    // ถ้าเป็นการ retry และมี attempt ค้างอยู่ ให้ปิด attempt ค้างก่อน (กันการมีหลาย attempt เปิดพร้อมกัน)
    if (activeAttempt && isRetry) {
      activeAttempt.completedAt = new Date();
      activeAttempt.score = null as any;
      activeAttempt.passed = false;
      await this.attemptRepository.save(activeAttempt);
    }

    // 3. ถ้าไม่มีเลย ถึงจะสร้างใหม่
    const attempt = this.attemptRepository.create({
      quizId: quiz.id,
      userId: numericUserId,
      startedAt: new Date(),
    });

    return this.attemptRepository.save(attempt);
  }

  async hasCompletedQuiz(quizId: number | string, userId: string | number) {
    const numericQuizId = Number(quizId);
    const numericUserId = Number(userId);

    const completed = await this.attemptRepository.findOne({
      where: {
        quizId: numericQuizId,
        userId: numericUserId,
        completedAt: Not(IsNull()),
      },
    });

    return Boolean(completed);
  }

  async getActiveAttempt(
    quizId: number | string,
    userId: string | number,
  ): Promise<QuizAttempt | null> {
    return this.attemptRepository.findOne({
      where: {
        quizId: Number(quizId),
        userId: Number(userId),
        completedAt: IsNull(),
      },
      order: { startedAt: 'DESC' },
    });
  }

  async submitQuiz(
    quizId: string,
    userId: string,
    submitDto: SubmitQuizDto,
  ): Promise<QuizSolutionResponseDto> {
    const quiz = await this.findOneQuiz(quizId);
    const numericQuizId = Number(quizId);
    const numericUserId = Number(userId);

    // 1. Find the active attempt
    const attempt = await this.attemptRepository.findOne({
      where: {
        quizId: numericQuizId,
        userId: numericUserId,
        completedAt: IsNull(),
      },
      order: { startedAt: 'DESC' },
    });

    if (!attempt) {
      // เช็คว่าเพราะทำเสร็จไปแล้ว หรือเพราะยังไม่ได้เริ่ม
      const hasCompleted = await this.attemptRepository.findOne({
        where: {
          quizId: numericQuizId,
          userId: numericUserId,
          completedAt: Not(IsNull()),
        },
      });

      if (hasCompleted) {
        throw new BadRequestException(
          'คุณได้ทำ Quiz นี้เสร็จสิ้นแล้ว ไม่สามารถส่งซ้ำได้',
        );
      }

      throw new BadRequestException(
        'ไม่พบรายการที่กำลังทำอยู่ กรุณาเริ่ม Quiz ก่อนส่งคำตอบ',
      );
    }

    // 2. Check if all questions are answered (Acceptance Criteria: การป้องกันการส่งคำตอบเมื่อยังตอบไม่ครบ)
    const totalQuestions = quiz.questions.length;
    const answeredQuestionIds = new Set(
      submitDto.answers
        .filter((a) => {
          const val = a.answer;
          if (val === null || val === undefined) return false;
          if (typeof val === 'string' && val.trim() === '') return false;
          if (Array.isArray(val) && val.length === 0) return false;
          // For True/False, false is a valid answer, so it will return true here
          return true;
        })
        .map((a) => a.questionId),
    );

    if (answeredQuestionIds.size < totalQuestions) {
      const missingIds = quiz.questions
        .filter((q) => !answeredQuestionIds.has(q.id))
        .map((q) => q.id);

      throw new BadRequestException({
        message: 'กรุณาตอบคำถามให้ครบทุกข้อก่อนส่งคำตอบ',
        missingQuestionIds: missingIds,
      });
    }

    // 3. Calculate score and validate questions
    let correctAnswers = 0;
    const results: { questionId: number; isCorrect: boolean }[] = [];

    for (const answer of submitDto.answers) {
      const question = quiz.questions.find((q) => q.id === answer.questionId);
      if (!question) {
        throw new BadRequestException(
          `Question ID ${answer.questionId} does not belong to this quiz`,
        );
      }

      // --- Validate Answer Format per Type ---
      if (question.type === QuestionType.MULTIPLE_CHOICE) {
        if (typeof answer.answer !== 'string') {
          throw new BadRequestException(
            `คำตอบของข้อที่ ${question.id} ต้องเป็นตัวหนังสือ (String) เท่านั้น`,
          );
        }

        const submitted = answer.answer.trim();
        const options = (question.options as string[]) || [];

        if (options.length === 0) {
          throw new BadRequestException(
            `คำถามข้อที่ ${question.id} ไม่มีตัวเลือก (Options) ในระบบ`,
          );
        }

        // ใช้การเทียบแบบ trim เพื่อความแม่นยำ (กันช่องว่างส่วนเกิน)
        const isValidOption = options.some(
          (opt) => String(opt).trim() === submitted,
        );

        if (!isValidOption) {
          throw new BadRequestException(
            `คำตอบ "${submitted}" ของคำถามที่ ${question.id} ไม่ได้อยู่ในรายการตัวเลือกที่มีให้`,
          );
        }
      }

      if (question.type === QuestionType.TRUE_FALSE) {
        const val = String(answer.answer).toLowerCase();
        if (val !== 'true' && val !== 'false') {
          throw new BadRequestException(
            `คำตอบของคำถามประเภท True/False (ID: ${question.id}) ต้องเป็น true หรือ false เท่านั้น`,
          );
        }
      }

      if (question.type === QuestionType.MATCH_PAIRS) {
        const submittedPairs = answer.answer;
        if (!Array.isArray(submittedPairs)) {
          throw new BadRequestException(
            `คำตอบของข้อที่ ${question.id} (Match Pairs) ต้องเป็นรายการคู่จับคู่ (Array)`,
          );
        }

        const options = (question.options as any[]) || [];
        // AC Requirement: ต้องจับคู่ให้ครบทุกคู่
        if (submittedPairs.length !== options.length) {
          throw new BadRequestException(
            `กรุณาจับคู่คำตอบให้ครบทุกข้อ (ข้อที่ ${question.id} ยังจับคู่ไม่ครบ)`,
          );
        }

        const lefts = new Set();
        const rights = new Set();

        for (const p of submittedPairs) {
          if (!p || p.left === undefined || p.right === undefined) {
            throw new BadRequestException(
              `รูปแบบการจับคู่ในข้อที่ ${question.id} ไม่ถูกต้อง (ต้องมีทั้ง left และ right)`,
            );
          }

          const left = String(p.left).trim();
          const right = String(p.right).trim();

          // Red Case: ป้องกันการเลือกคำตอบซ้ำ
          if (lefts.has(left)) {
            throw new BadRequestException(
              `คำถามฝั่งซ้าย "${left}" ในข้อที่ ${question.id} ถูกใช้ซ้ำ`,
            );
          }
          if (rights.has(right)) {
            throw new BadRequestException(
              `คำตอบฝั่งขวา "${right}" ในข้อที่ ${question.id} ถูกใช้ซ้ำ (คำตอบนี้ถูกใช้แล้ว)`,
            );
          }

          lefts.add(left);
          rights.add(right);

          // ตรวจสอบว่าค่าที่ส่งมามีอยู่ใน Options จริงหรือไม่
          const isValidPair = options.some(
            (opt) =>
              String(opt.left).trim() === left ||
              String(opt.right).trim() === right,
          );

          if (!isValidPair) {
            throw new BadRequestException(
              `การจับคู่ "${left}" - "${right}" ในข้อที่ ${question.id} ไม่มีอยู่ในตัวเลือกที่มีให้`,
            );
          }
        }
      }

      if (question.type === QuestionType.CORRECT_ORDER) {
        const submittedOrder = answer.answer;
        if (!Array.isArray(submittedOrder)) {
          throw new BadRequestException(
            `คำตอบของข้อที่ ${question.id} (Correct Order) ต้องเป็นรายการเรียงลำดับ (Array)`,
          );
        }

        const options = (question.options as any[]) || [];
        // AC Requirement: ต้องเรียงลำดับให้ครบทุกรายการ
        if (submittedOrder.length !== options.length) {
          throw new BadRequestException(
            `กรุณาเรียงลำดับรายการให้ครบทุกข้อ (ข้อที่ ${question.id} ยังเรียงไม่ครบ)`,
          );
        }

        // ตรวจสอบว่ารายการที่ส่งมา ตรงกับที่มีในโจทย์จริงๆ หรือไม่
        const optionTexts = options.map((o) => String(o.text).trim());
        const isValid = submittedOrder.every((item) =>
          optionTexts.includes(String(item).trim()),
        );

        if (!isValid) {
          throw new BadRequestException(
            `รายการที่ส่งมาในข้อที่ ${question.id} ไม่ถูกต้อง (ไม่ตรงกับตัวเลือกที่มี)`,
          );
        }
      }
      // ----------------------------------------

      const isCorrect = this.isAnswerCorrect(question, answer.answer);
      results.push({ questionId: answer.questionId, isCorrect });
      if (isCorrect) {
        correctAnswers++;
      }
    }

    const score =
      totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const passed = score >= 60; // Default passing score is now 60%

    // 4. Update and save attempt
    attempt.answers = submitDto.answers;
    attempt.results = results;
    attempt.score = score;
    attempt.passed = passed;
    attempt.completedAt = new Date();

    const savedAttempt = await this.attemptRepository.save(attempt);

    // 5. Auto-update Lesson Progress if passed
    if (passed) {
      try {
        await firstValueFrom(
          this.httpService.post(
            `${this.learningServiceUrl}/api/learning/lessons/${quiz.lessonId}/complete`,
            {},
            {
              headers: {
                // Pass user context if needed, here we assume internal call or handled by userId in body if API allowed
                'x-user-id': userId,
              },
            },
          ),
        );
      } catch (error) {
        console.error('Failed to update lesson progress via HTTP:', error.message);
        // We don't throw here to not break quiz submission if progress service is down
      }
    }

    // Return structured solution response for Scenario 2 & 3
    return this.getQuizSolution(String(quiz.id), userId);
  }

  async getQuizSolution(
    quizId: string,
    userId: string,
  ): Promise<QuizSolutionResponseDto> {
    const numericQuizId = Number(quizId);
    const numericUserId = Number(userId);

    const quiz = await this.findOneQuiz(quizId);
    const attempt = await this.attemptRepository.findOne({
      where: {
        quizId: numericQuizId,
        userId: numericUserId,
        completedAt: Not(IsNull()),
      },
      order: { completedAt: 'DESC' },
    });

    if (!attempt) {
      throw new NotFoundException(
        'ยังไม่มีผลการทำแบบทดสอบสำหรับ Quiz นี้',
      );
    }

    const answersByQuestion = new Map(
      (attempt.answers || []).map((ans) => [ans.questionId, ans.answer]),
    );
    const resultsByQuestion = new Map(
      (attempt.results || []).map((result) => [
        result.questionId,
        result.isCorrect,
      ]),
    );

    const solutions = quiz.questions.map((question) => {
      const userAnswer = answersByQuestion.get(question.id);
      let isCorrect = resultsByQuestion.get(question.id);

      if (isCorrect === undefined) {
        isCorrect =
          userAnswer === undefined
            ? false
            : this.isAnswerCorrect(question, userAnswer);
      }

      return {
        questionId: question.id,
        question: question.question,
        type: question.type,
        options: question.options,
        userAnswer: userAnswer ?? null,
        isCorrect,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation ?? null,
      };
    });

    const totalQuestions = quiz.questions.length;
    const correctCount = solutions.filter((s) => s.isCorrect).length;

    return {
      attemptId: attempt.id,
      quizId: numericQuizId,
      correctCount,
      totalQuestions,
      score: Number(attempt.score ?? 0),
      passed: attempt.passed,
      completedAt: attempt.completedAt?.toISOString(),
      solutions,
    };
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

  async completeQuiz(
    quizId: string | number,
    userId: string | number,
    status: 'COMPLETED' | 'SKIPPED',
  ): Promise<QuizAttempt> {
    const attempt = await this.getActiveAttempt(quizId, userId);
    if (!attempt) {
      const hasCompleted = await this.hasCompletedQuiz(quizId, userId);
      if (hasCompleted) {
        throw new BadRequestException('Quiz already completed');
      }
      const newAttempt = this.attemptRepository.create({
        quizId: Number(quizId),
        userId: Number(userId),
        startedAt: new Date(),
        completedAt: new Date(),
        completionStatus: status,
        // User Story: Skip ถือว่า Completed แต่ไม่ใช่คะแนน 100
        score: null as any,
        passed: false,
      });
      return this.attemptRepository.save(newAttempt);
    }

    attempt.completedAt = new Date();
    attempt.completionStatus = status;

    if (status === 'SKIPPED') {
      attempt.score = null as any;
      attempt.passed = false;
      return this.attemptRepository.save(attempt);
    }

    // COMPLETED: คำนวณคะแนนจากผลที่สะสมไว้ (จากการ check รายข้อ)
    const quiz = await this.findOneQuiz(String(quizId));
    const answers = attempt.answers || [];
    const correctCount = quiz.questions.filter((q) => {
      const a = answers.find((x) => x.questionId === q.id);
      if (!a) return false;
      return this.isAnswerCorrect(q, a.answer);
    }).length;

    const totalQuestions = quiz.questions.length;
    const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
    attempt.score = score as any;
    attempt.passed = score >= 60;

    return this.attemptRepository.save(attempt);
  }

  async checkAnswer(
    userId: string,
    data: { questionId: number; answer: any },
  ) {
    const question = await this.questionRepository.findOne({
      where: { id: data.questionId },
    });
    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const isCorrect = this.isAnswerCorrect(question, data.answer);

    return {
      isCorrect,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || '',
      isCompleted: await this.hasCompletedQuiz(question.quizId, userId),
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
