import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Quizs } from './entities/quizs.entity';
import { QuizsCheckpoint } from './entities/checkpoint.entity';
import { QuizsResult, QuizsResultType, QuizsStatus } from './entities/quizs-result.entity';
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
      where: { lessonId, userId, type: QuizsResultType.QUIZ },
    });

    // ถ้ายังไม่เคยทำ quiz → แสดง quiz ปกติ (ซ่อนคำตอบ)
    if (!result) {
      return {
        quizs_id: quiz.quizsId,
        quizs_type: quiz.quizsType,
        quizs_question: quiz.quizsQuestions,
        quizs_option: quiz.quizsOption,
        lesson_id: quiz.lessonId,
        quizs_answer: null,
        quizs_explanation: null,
        status: 'NOT_ATTEMPTED',
        user_answer: null,
        is_correct: null,
        completed_at: null,
      };
    }

    // Legacy/backward-compat: previously, wrong answers were stored as PENDING.
    // Treat any row with userAnswer as attempted and show review data.
    const attempted = result.userAnswer != null;
    if (!attempted) {
      return {
        quizs_id: quiz.quizsId,
        quizs_type: quiz.quizsType,
        quizs_question: quiz.quizsQuestions,
        quizs_option: quiz.quizsOption,
        lesson_id: quiz.lessonId,
        quizs_answer: null,
        quizs_explanation: null,
        status: result.status,
        user_answer: null,
        is_correct: null,
        completed_at: null,
      };
    }

    // ถ้าทำ quiz แล้ว (COMPLETED หรือ SKIPPED) → แสดงข้อมูล review ทั้งหมด
    return {
      quizs_id: quiz.quizsId,
      quizs_type: quiz.quizsType,
      quizs_question: quiz.quizsQuestions,
      quizs_option: quiz.quizsOption,
      lesson_id: quiz.lessonId,
      quizs_answer: quiz.quizsAnswer,
      quizs_explanation: quiz.quizsExplanation,
      status: result.status === QuizsStatus.PENDING ? QuizsStatus.COMPLETED : result.status,
      user_answer: result.userAnswer,
      is_correct: result.isCorrect,
      completed_at: result.updatedAt,
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

    // 2. ตรวจสอบว่าเคยทำ quiz นี้แล้วหรือไม่
    const existingResult = await this.resultRepository.findOne({
      where: { lessonId, userId, type: QuizsResultType.QUIZ },
    });

    // 3. บังคับให้ทำครั้งเดียว: หากมีคำตอบบันทึกอยู่แล้ว หรือข้าม/ทำเสร็จแล้ว จะไม่สามารถลองทำใหม่ได้
    if (existingResult) {
      const alreadyAttempted = existingResult.userAnswer != null;
      const alreadyFinal = existingResult.status === QuizsStatus.COMPLETED || existingResult.status === QuizsStatus.SKIPPED;

      if (alreadyAttempted || alreadyFinal) {
        throw new ConflictException('This quiz has already been attempted and cannot be answered again.');
      }
    }

    // 4. ตรวจคำตอบ (ใช้ isEqual กันลำดับ array / object)
    const isCorrect = isEqual(
      quiz.quizsAnswer,
      answer,
    );

    // 5. สร้างหรืออัปเดต result
    let result = existingResult;
    if (!result) {
      result = this.resultRepository.create({
        lessonId,
        userId,
        type: QuizsResultType.QUIZ,
        checkpointId: null,
      });
    }

    // 6. บันทึกผลลัพธ์การทำ quiz
    result.userAnswer = answer;
    result.isCorrect = isCorrect;
    // Mark as COMPLETED regardless of correctness (single attempt).
    result.status = QuizsStatus.COMPLETED;

    await this.resultRepository.save(result);

    // 7. ถ้าตอบถูก → sync progress (UserXp)
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

    // 8. ส่งผลลัพธ์กลับไปให้ frontend
    return {
      isCorrect,
      quizs_answer: quiz.quizsAnswer,
      quizs_explanation: quiz.quizsExplanation,
    };
  }


  // ข้าม quiz โดยบันทึกสถานะเป็น SKIPPED
  async skipQuiz(lessonId: number, userId: string) {
    let result = await this.resultRepository.findOne({
      where: { lessonId, userId, type: QuizsResultType.QUIZ },
    });
    if (!result) {
      result = this.resultRepository.create({
        lessonId,
        userId,
        type: QuizsResultType.QUIZ,
        checkpointId: null,
      });
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

  async findOneCheckpointById(
    checkpointId: number,
  ): Promise<QuizsCheckpoint> {

    const checkpoint = await this.checkpointRepository.findOne({
      where: { checkpointId },
    });

    if (!checkpoint) {
      throw new NotFoundException('Checkpoint not found');
    }

    return checkpoint;
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

  // อัปเดต checkpoint ตาม checkpoint ID
  async updateCheckpoint(
    checkpointId: number,
    dto: Partial<CreateCheckpointDto>,
  ): Promise<QuizsCheckpoint> {

    const checkpoint = await this.checkpointRepository.findOne({
      where: { checkpointId },
    });

    if (!checkpoint) {
      throw new NotFoundException('Checkpoint not found');
    }

    Object.assign(checkpoint, {
      checkpointLevel: dto.checkpoint_level ?? checkpoint.checkpointLevel,
      checkpointType: dto.checkpoint_type ?? checkpoint.checkpointType,
      checkpointQuestions: dto.checkpoint_questions ?? checkpoint.checkpointQuestions,
      checkpointOption: dto.checkpoint_option ?? checkpoint.checkpointOption,
      checkpointAnswer: dto.checkpoint_answer ?? checkpoint.checkpointAnswer,
      checkpointExplanation: dto.checkpoint_explanation ?? checkpoint.checkpointExplanation,
    });

    return this.checkpointRepository.save(checkpoint);
  }

  // ลบ quiz ตาม lesson ID
  async removeQuizs(lessonId: number): Promise<void> {
    const quiz = await this.findOneQuizsByLesson(lessonId);
    await this.quizsRepository.remove(quiz);
  }

  // ลบ checkpoint ตาม checkpoint ID
  async removeCheckpoint(checkpointId: number): Promise<void> {

    const checkpoint = await this.checkpointRepository.findOne({
      where: { checkpointId },
    });

    if (!checkpoint) {
      throw new NotFoundException('Checkpoint not found');
    }

    await this.checkpointRepository.remove(checkpoint);
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
      checkpointLevel: dto.checkpoint_level ?? 1,
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

    const checkpoints = await this.checkpointRepository.find({
      where: { lessonId },
    });

    // โหลดผลลัพธ์ของผู้ใช้รายคน (per-checkpoint)
    const checkpointIds = checkpoints.map((c) => c.checkpointId);
    const results = checkpointIds.length
      ? await this.resultRepository.find({
        where: {
          userId,
          type: QuizsResultType.CHECKPOINT,
          checkpointId: In(checkpointIds),
        },
      })
      : [];
    const resultByCheckpointId = new Map(results.map((r) => [r.checkpointId, r] as const));

    // รวมข้อมูล checkpoint กับผลลัพธ์ของผู้ใช้ เพื่อส่งกลับไปให้ frontend
    return checkpoints.map((c) => {
      const r = resultByCheckpointId.get(c.checkpointId) ?? null;
      const attempted = r?.userAnswer != null;
      const isCorrect = attempted ? r?.isCorrect === true : false;
      const isSkipped = r?.status === QuizsStatus.SKIPPED;
      const checkpointStatus = isCorrect ? 'COMPLETED' : isSkipped ? 'SKIPPED' : 'PENDING';

      const level = c.checkpointLevel ?? 1;
      const scoreByLevel: Record<number, number> = { 1: 5, 2: 10, 3: 15 };
      const correctScore = scoreByLevel[level] ?? 5;

      // เมื่อ "ตอบแล้ว" ให้ดึงเฉลยจาก GET ได้
      // ถ้ากดข้าม (SKIPPED) ให้เห็นเฉลยได้เช่นกัน
      const showSolution = attempted || isSkipped;

      return {
        checkpoint_id: c.checkpointId,
        lesson_id: c.lessonId,
        chapter_id: lesson.chapter_id,
        type: c.checkpointType,
        question: c.checkpointQuestions,
        options: c.checkpointOption ?? null,
        student_progress: {
          // ตาม requirement: เมื่อ "ตอบแล้ว" ให้ดึงเฉลยจาก GET ได้
          // (เริ่มต้นยังไม่ตอบ ต้องเป็น null)
          correct_answer: showSolution ? c.checkpointAnswer : null,
          // แสดงคำตอบที่ผู้ใช้ตอบล่าสุด (เพื่อกลับเข้าหน้าเดิมแล้วเห็นคำตอบที่เคยเลือก)
          user_answer: r?.userAnswer ?? null,
          // ถ้ายังไม่เคยตอบ ให้เป็น null (ไม่ใช่ true/false)
          is_correct: attempted ? (r?.isCorrect ?? null) : null,
          feedback: isSkipped ? 'ข้ามแล้ว' : attempted ? (isCorrect ? 'ผ่านแล้ว' : 'เกือบถูกแล้ว !') : null,
          checkpoint_status: checkpointStatus,
        },
        checkpoint_explanation: showSolution ? (c.checkpointExplanation ?? null) : null,
        // ตาม requirement: เมื่อ "ตอบแล้ว" ให้ GET คืนคะแนนได้ (ผิด = 0, ถูก = 5)
        score: attempted ? (isCorrect ? correctScore : 0) : isSkipped ? 0 : null,
      };
    });
  }

  // ข้าม checkpoint (บันทึกเป็น SKIPPED)
  async skipCheckpoint(checkpointId: number, userId: string) {
    const checkpoint = await this.checkpointRepository.findOne({
      where: { checkpointId },
    });

    if (!checkpoint) {
      throw new NotFoundException('Checkpoint not found');
    }

    // ตรวจสอบว่าเคยทำ checkpoint นี้แล้วหรือไม่ (ทั้งตอบและข้าม)
    const existing = await this.resultRepository.findOne({
      where: {
        userId,
        lessonId: checkpoint.lessonId,
      },
    });

    // ถ้าตอบถูกแล้ว ห้ามข้าม/ทำซ้ำ
    if (existing?.isCorrect === true && existing.userAnswer != null) {
      throw new ConflictException('This checkpoint has already been completed and cannot be skipped.');
    }

    // ถ้าข้ามแล้วแล้ว ให้คืนค่าเดิม
    if (existing?.status === QuizsStatus.SKIPPED) {
      return {
        checkpoint_id: checkpoint.checkpointId,
        lesson_id: checkpoint.lessonId,
        user_answer: null,
        is_correct: null,
        score: 0,
        correct_answer: checkpoint.checkpointAnswer,
        checkpoint_explanation: checkpoint.checkpointExplanation ?? null,
        feedback: 'ข้ามแล้ว',
        checkpoint_status: 'SKIPPED',
      };
    }

    // บันทึกผลเป็น SKIPPED (ถ้ายังไม่มีผลลัพธ์ หรือเคยตอบผิดมาก่อน)
    let toSave = existing;
    if (!toSave) {
      toSave = this.resultRepository.create({
        userId,
        lessonId: checkpoint.lessonId,
        type: QuizsResultType.CHECKPOINT,
        checkpointId,
      });
    } else {

      // อัปเดตเป็น SKIPPED เฉพาะกรณีที่ยังไม่เคยตอบถูกจริง ๆ (มีคำตอบที่บันทึกไว้)
      toSave.type = QuizsResultType.CHECKPOINT;
      toSave.checkpointId = checkpoint.checkpointId;
    }

    toSave.status = QuizsStatus.SKIPPED;
    toSave.userAnswer = null;
    toSave.isCorrect = null;
    await this.resultRepository.save(toSave);

    return {
      checkpoint_id: checkpoint.checkpointId,
      lesson_id: checkpoint.lessonId,
      user_answer: null,
      is_correct: null,
      score: 0,
      correct_answer: checkpoint.checkpointAnswer,
      checkpoint_explanation: checkpoint.checkpointExplanation ?? null,
      feedback: 'ข้ามแล้ว',
      checkpoint_status: 'SKIPPED',
    };
  }

  // ใช้เวลาเรียกจาก progress เมื่อบทเรียนเป็น checkpoint แล้วกด skip
  // ให้ sync สถานะเฉพาะของ checkpoint เป็น SKIPPED ทั้งหมดในบทเรียน (กรณีมีหลาย checkpoint ในบทเรียนเดียวกัน)
  async skipCheckpointsByLesson(lessonId: number, userId: string) {
    const checkpoints = await this.checkpointRepository.find({
      where: { lessonId },
    });

    if (!checkpoints.length) {
      return [];
    }

    return Promise.all(
      checkpoints.map((c) => this.skipCheckpoint(c.checkpointId, userId)),
    );
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

    // ตรวจสอบว่าเคยทำ checkpoint นี้แล้วหรือไม่
    const existing = await this.resultRepository.findOne({
      where: {
        userId,
        type: QuizsResultType.CHECKPOINT,
        checkpointId,
      },
    });

    if (existing?.status === QuizsStatus.SKIPPED) {
      throw new ConflictException('This checkpoint has been skipped and cannot be answered.');
    }

    // ล็อกการทำซ้ำ "เฉพาะ" กรณีที่เคยตอบถูกจริง ๆ (มีคำตอบที่บันทึกไว้)
    // กันเคสข้อมูล legacy ที่อาจมี isCorrect=true แต่ userAnswer=null ทำให้ตอบไม่ได้ทั้งที่ยังไม่เคยตอบจริง
    if (existing?.isCorrect === true && existing.userAnswer != null) {
      throw new ConflictException('This checkpoint has already been completed and cannot be answered again.');
    }

    // เทียบคำตอบแบบถูกต้องจริง
    const isCorrect = isEqual(
      checkpoint.checkpointAnswer,
      answer,
    );

    const level = checkpoint.checkpointLevel ?? 1;
    const scoreByLevel: Record<number, number> = { 1: 5, 2: 10, 3: 15 };
    const score = isCorrect ? (scoreByLevel[level] ?? 5) : 0;

    const lesson = await this.lessonRepository.findOne({
      where: { lesson_id: checkpoint.lessonId },
    });

    // upsert quizs_results (checkpoint)
    const toSave = existing ??
      this.resultRepository.create({
        userId,
        lessonId: checkpoint.lessonId,
        type: QuizsResultType.CHECKPOINT,
        checkpointId,
      });

    toSave.userAnswer = answer;
    toSave.isCorrect = isCorrect;
    toSave.status = isCorrect ? QuizsStatus.COMPLETED : QuizsStatus.PENDING;
    await this.resultRepository.save(toSave);

    // กรณีที่ไม่มี lesson (ข้อมูลไม่สมบูรณ์) ให้ส่งผลลัพธ์การทำ quiz ได้ แต่ไม่ต้อง sync progress ก็ได้
    if (!lesson) {
      return {
        checkpoint_id: checkpoint.checkpointId,
        lesson_id: checkpoint.lessonId,
        chapter_id: null,
        user_answer: answer,
        is_correct: isCorrect,
        score,
        correct_answer: checkpoint.checkpointAnswer,
        checkpoint_explanation: checkpoint.checkpointExplanation ?? null,
        feedback: isCorrect
          ? 'ผ่านแล้ว แต่ไม่สามารถให้ XP ได้'
          : 'เกือบถูกแล้ว !',
        checkpoint_status: isCorrect
          ? 'COMPLETED'
          : 'PENDING',
      };
    }

    // ถ้าตอบถูก → sync progress (UserXp)
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

    // update UserXp เฉพาะตอนตอบถูก
    if (isCorrect) {
      userXp.checkpointStatus = 'COMPLETED';
      userXp.completedAt = new Date();

      // ให้ XP แค่ครั้งแรกของ chapter (ตาม design เดิม)
      if (userXp.xpEarned === 0) {
        userXp.xpEarned = score;
      }
    }

    userXp = await this.userXpRepository.save(userXp);

    return {
      checkpoint_id: checkpoint.checkpointId,
      lesson_id: checkpoint.lessonId,
      chapter_id: chapterId,
      user_answer: answer,
      is_correct: isCorrect,
      score,
      correct_answer: checkpoint.checkpointAnswer,
      checkpoint_explanation: checkpoint.checkpointExplanation ?? null,
      feedback: isCorrect
        ? 'ยอดเยี่ยมมาก !'
        : 'เกือบถูกแล้ว !',
      checkpoint_status: isCorrect ? 'COMPLETED' : 'PENDING',
    };
  }

}

// ฟังก์ชันช่วยเปรียบเทียบคำตอบแบบ deep equality (รองรับการเปรียบเทียบ array/object โดยไม่สนใจลำดับ)
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