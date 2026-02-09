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

  // สร้างหรืออัปเดต quiz สำหรับบทเรียน (1 บทเรียน = 1 ควิซ)
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

  // ดึง quiz พร้อมสถานะสำหรับผู้ใช้
  async getQuizWithStatus(lessonId: number, userId: string) {
    const quiz = await this.quizsRepository.findOne({ where: { lessonId } });
    if (!quiz) {
      throw new NotFoundException(`Quiz for lesson ${lessonId} not found`);
    }

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
      quizs_answer: showAnswer ? quiz.quizsAnswer : null,
      quizs_explanation: showAnswer ? quiz.quizsExplanation : null,
    };
  }

  // ตรวจคำตอบ quiz และบันทึกผล
  async checkAndSaveAnswer(
    lessonId: number,
    userId: string,
    answer: any,
  ) {
    // 1. หา quiz ของ lesson
    const quiz = await this.quizsRepository.findOne({
      where: { lessonId },
    });
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // 2. ตรวจคำตอบ (ใช้ isEqual กันลำดับ array / object)
    const isCorrect = isEqual(
      quiz.quizsAnswer,
      answer,
    );

    // 3. หา result เดิมของ user
    let result = await this.resultRepository.findOne({
      where: { lessonId, userId },
    });

    // 4. ถ้ายังไม่เคยทำ quiz นี้ → สร้าง record ใหม่
    if (!result) {
      result = this.resultRepository.create({
        lessonId,
        userId,
      });
    }

    // 5. บันทึกผลลัพธ์การทำ quiz
    result.userAnswer = answer;
    result.isCorrect = isCorrect;
    result.status = isCorrect
      ? QuizsStatus.COMPLETED
      : QuizsStatus.PENDING;

    await this.resultRepository.save(result);

    // 6. ถ้าตอบถูก → sync progress (UserXp)
    if (isCorrect) {
      const lesson = await this.lessonRepository.findOne({
        where: { lesson_id: lessonId },
      });

      if (lesson) {
        let userXp = await this.userXpRepository.findOne({
          where: {
            userId,
            chapterId: lesson.chapter_id,
          },
        });

        // ถ้ายังไม่มี progress → สร้างใหม่
        if (!userXp) {
          userXp = this.userXpRepository.create({
            userId,
            chapterId: lesson.chapter_id,
            xpEarned: 0, // quiz ไม่ให้ XP (ตาม design ปัจจุบัน)
            checkpointStatus: 'COMPLETED',
            completedAt: new Date(),
            lastAttemptAt: new Date(),
          });
        } else {
          // ถ้ามีอยู่แล้ว → อัปเดตสถานะ
          userXp.checkpointStatus = 'COMPLETED';
          userXp.completedAt = new Date();
          userXp.lastAttemptAt = new Date();
        }

        await this.userXpRepository.save(userXp);
      }
    }

    // 7. ส่งผลลัพธ์กลับไปให้ frontend
    return {
      isCorrect,
      correctAnswer: quiz.quizsAnswer,
      quizs_explanation: quiz.quizsExplanation,
    };
  }


  // ข้าม quiz โดยบันทึกสถานะเป็น SKIPPED
  async skipQuiz(lessonId: number, userId: string) {
    let result = await this.resultRepository.findOne({ where: { lessonId, userId } });
    if (!result) {
      result = this.resultRepository.create({ lessonId, userId });
    }
    result.status = QuizsStatus.SKIPPED;
    return this.resultRepository.save(result);
  }

  // Quizs CRUD operations
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

  // หา quiz ตาม lesson ID
  async findOneQuizsByLesson(lessonId: number): Promise<Quizs> {
    const quiz = await this.quizsRepository.findOne({ where: { lessonId } });
    if (!quiz) throw new NotFoundException('Quiz not found');
    return quiz;
  }

  // อัปเดต quiz ตาม lesson ID
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

  // ลบ quiz ตาม lesson ID
  async removeQuizs(lessonId: number): Promise<void> {
    const quiz = await this.findOneQuizsByLesson(lessonId);
    await this.quizsRepository.remove(quiz);
  }


  // Checkpoint CRUD operations
  // สร้างหรืออัปเดต checkpoint สำหรับบทเรียน (1 บทเรียน = 1 checkpoint)
  async createCheckpoint(dto: CreateCheckpointDto): Promise<QuizsCheckpoint> {
    const lesson = await this.lessonRepository.findOne({
      where: { lesson_id: dto.lesson_id },
    });
    if (!lesson) {
      throw new NotFoundException(`Lesson ${dto.lesson_id} not found`);
    }

    // ตรวจสอบว่ามี checkpoint อยู่แล้วหรือไม่
    const existing = await this.checkpointRepository.findOne({
      where: { lessonId: dto.lesson_id },
      order: { checkpointId: 'DESC' },
    });

    // เตรียมข้อมูลสำหรับสร้างหรืออัปเดต checkpoint
    const data = {
      lessonId: dto.lesson_id,
      checkpointType: dto.checkpoint_type,
      checkpointQuestions: dto.checkpoint_questions,
      checkpointOption: dto.checkpoint_option,
      checkpointAnswer: dto.checkpoint_answer,
      checkpointExplanation: dto.checkpoint_explanation,
    };

    // ถ้ามีอยู่แล้วให้ Update
    if (existing) {
      Object.assign(existing, data);
      return this.checkpointRepository.save(existing);
    }

    // ถ้าไม่มีให้สร้างใหม่
    const checkpoint = this.checkpointRepository.create(data);
    return this.checkpointRepository.save(checkpoint);
  }

  // หา checkpoints ตาม lesson ID
  async findCheckpointsByLesson(
    lessonId: number,
    userId: string,
  ) {
    const lesson = await this.lessonRepository.findOne({
      where: { lesson_id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException(
        `Lesson with ID ${lessonId} not found`,
      );
    }

    const userXp = await this.userXpRepository.findOne({
      where: {
        userId,
        chapterId: lesson.chapter_id,
      },
    });

    const checkpointStatus =
      (userXp?.checkpointStatus ?? 'PENDING') as
      | 'PENDING'
      | 'COMPLETED'
      | 'SKIPPED';

    const checkpoints = await this.checkpointRepository.find({
      where: { lessonId },
    });

    return checkpoints.map((c) => ({
      checkpoint_id: c.checkpointId,
      lesson_id: c.lessonId,
      chapter_id: lesson.chapter_id,
      type: c.checkpointType,
      question: c.checkpointQuestions,
      options: c.checkpointOption ?? null,
      student_progress: {
        correct_answer:
          checkpointStatus === 'COMPLETED'
            ? c.checkpointAnswer
            : null,
        feedback:
          checkpointStatus === 'COMPLETED'
            ? 'ผ่านแล้ว'
            : null,
        checkpoint_status: checkpointStatus,
      },
      checkpoint_explanation:
        checkpointStatus === 'COMPLETED'
          ? c.checkpointExplanation
          : null,
    }));
  }


  // ตรวจคำตอบ checkpoint และบันทึกผล
  async checkCheckpointAnswer(
    checkpointId: number,
    userId: string,
    answer: any,
  ) {
    const checkpoint = await this.checkpointRepository.findOne({
      where: { checkpointId },
    });

    if (!checkpoint) {
      throw new NotFoundException('Checkpoint not found');
    }

    // เทียบคำตอบแบบถูกต้องจริง
    const isCorrect = isEqual(
      checkpoint.checkpointAnswer,
      answer,
    );


    const score = isCorrect ? 5 : 0;

    const lesson = await this.lessonRepository.findOne({
      where: { lesson_id: checkpoint.lessonId },
    });

    // ---- กรณีไม่พบ lesson (แต่ยังคืน status ให้ถูก) ----
    if (!lesson) {
      return {
        checkpoint_id: checkpoint.checkpointId,
        lesson_id: checkpoint.lessonId,
        chapter_id: null,
        is_correct: isCorrect,
        score,
        correct_answer: checkpoint.checkpointAnswer,
        checkpoint_explanation:
          checkpoint.checkpointExplanation ?? null,
        feedback: isCorrect
          ? 'ผ่านแล้ว แต่ไม่สามารถให้ XP ได้'
          : 'เกือบถูกแล้ว !',
        checkpoint_status: isCorrect
          ? 'COMPLETED'
          : 'PENDING',
      };
    }

    // ---- update UserXp ----
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

    userXp.lastAttemptAt = new Date();

    if (isCorrect) {
      userXp.checkpointStatus = 'COMPLETED';
      userXp.completedAt = new Date();

      // ให้ XP แค่ครั้งแรก
      if (userXp.xpEarned === 0) {
        userXp.xpEarned = 5;
      }
    }

    userXp = await this.userXpRepository.save(userXp);

    return {
      checkpoint_id: checkpoint.checkpointId,
      lesson_id: checkpoint.lessonId,
      chapter_id: chapterId,
      is_correct: isCorrect,
      score,
      correct_answer: checkpoint.checkpointAnswer,
      checkpoint_explanation:
        checkpoint.checkpointExplanation ?? null,
      feedback: isCorrect
        ? 'ยอดเยี่ยมมาก !'
        : 'เกือบถูกแล้ว !',
      checkpoint_status: userXp.checkpointStatus,
    };
  }

}

function normalize(value: any): any {
  // แปลง "2" -> 2
  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (!isNaN(Number(trimmed))) {
      return Number(trimmed);
    }

    return trimmed.toLowerCase();
  }

  if (Array.isArray(value)) {
    return value.map(normalize).sort();
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = normalize(value[key]);
        return acc;
      }, {} as any);
  }

  return value;
}

function isEqual(a: any, b: any): boolean {
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

