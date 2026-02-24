import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Quizs } from './entities/quizs.entity';
import { QuizsCheckpoint } from './entities/checkpoint.entity';
import { QuizsResult, QuizsResultType, QuizsStatus } from './entities/quizs-result.entity';
import { CreateQuizsDto, CreateCheckpointDto, UpdateQuizsDto, UpdateCheckpointDto } from './dto';
import { Lesson, LessonType } from '../lessons/entities/lesson.entity';
import { UserXp } from './entities/user-xp.entity';

@Injectable()
export class QuizService {
  private checkpointScoreFromLevelOrderIndex(levelOrderIndex?: number | null): number {
    const levelNumber = (levelOrderIndex ?? 0) + 1;
    const scoreByLevel: Record<number, number> = { 1: 5, 2: 10, 3: 15 };
    return scoreByLevel[levelNumber] ?? 5;
  }

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

        // คำนวณ xp ทั้งหมดของบท (รวมทุก checkpoint ใน chapter นี้)
        const lessonsInChapter = await this.lessonRepository.find({ where: { chapter_id: lesson.chapter_id } });
        const lessonIds = lessonsInChapter.map((l) => l.lesson_id);
        const checkpointsInChapter = await this.checkpointRepository.find({ where: { lessonId: In(lessonIds) } });
        const chapterTotalXp = checkpointsInChapter.reduce((s, c) => s + (c.checkpointScore ?? 5), 0);

        // ถ้ายังไม่มี progress → สร้างใหม่
        if (!userXp) {
          userXp = this.userXpRepository.create({
            userId,
            chapterId: lesson.chapter_id,
            xpEarned: 0, // quiz ไม่ให้ XP (ตาม design ปัจจุบัน)
            xpTotal: chapterTotalXp, // คำนวณ xp ทั้งหมดของบท (รวมทุก checkpoint ใน chapter นี้)
            checkpointStatus: 'COMPLETED',
            completedAt: new Date(),
            lastAttemptAt: new Date(),
          });
        } else {
          // ถ้ามีอยู่แล้ว → อัปเดตสถานะ และอัปเดต xpTotal ให้ตรงกับ chapter
          userXp.checkpointStatus = 'COMPLETED';
          userXp.completedAt = new Date();
          userXp.lastAttemptAt = new Date();
          userXp.xpTotal = chapterTotalXp; // อัปเดต xpTotal ให้ตรงกับ chapter
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

  async findOneCheckpointByLessonId(
    lessonId: number,
  ): Promise<QuizsCheckpoint> {
    const checkpoint = await this.checkpointRepository.findOne({
      where: { lessonId },
      order: { checkpointId: 'DESC' },
    });

    if (!checkpoint) {
      throw new NotFoundException('Checkpoint not found');
    }

    const lesson = await this.lessonRepository.findOne({ where: { lesson_id: lessonId } });
    if (!lesson || lesson.lesson_type !== LessonType.CHECKPOINT) {
      throw new NotFoundException('Checkpoint not found');
    }

    return checkpoint;
  }

  // อัปเดต quiz ตาม lesson ID
  async updateQuizs(lessonId: number, dto: Partial<UpdateQuizsDto>): Promise<Quizs> {
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
    dto: Partial<UpdateCheckpointDto>,
  ): Promise<QuizsCheckpoint> {

    const checkpoint = await this.checkpointRepository.findOne({
      where: { checkpointId },
    });

    if (!checkpoint) {
      throw new NotFoundException('Checkpoint not found');
    }

    // ผูก checkpointScore กับ Level ของ lesson โดยอัตโนมัติ
    const lesson = await this.lessonRepository.findOne({
      where: { lesson_id: checkpoint.lessonId },
      relations: { chapter: { level: true } },
    });

    if (lesson?.chapter?.level) {
      checkpoint.checkpointScore = this.checkpointScoreFromLevelOrderIndex(
        lesson.chapter.level.level_orderIndex,
      );
    }

    Object.assign(checkpoint, {
      checkpointType: dto.checkpoint_type ?? checkpoint.checkpointType,
      checkpointQuestions: dto.checkpoint_questions ?? checkpoint.checkpointQuestions,
      checkpointOption: dto.checkpoint_option ?? checkpoint.checkpointOption,
      checkpointAnswer: dto.checkpoint_answer ?? checkpoint.checkpointAnswer,
      checkpointExplanation: dto.checkpoint_explanation ?? checkpoint.checkpointExplanation,
    });

    return this.checkpointRepository.save(checkpoint);
  }

  // อัปเดต checkpoint ตาม lesson ID
  async updateCheckpointByLessonId(
    lessonId: number,
    dto: Partial<UpdateCheckpointDto>,
  ): Promise<QuizsCheckpoint> {
    const checkpoint = await this.findOneCheckpointByLessonId(lessonId);
    return this.updateCheckpoint(checkpoint.checkpointId, dto);
  }

  // ลบ quiz ตาม lesson ID
  async removeQuizs(lessonId: number): Promise<{ message: string }> {
    const quiz = await this.findOneQuizsByLesson(lessonId);

    // ลบ quiz ก่อน
    await this.quizsRepository.remove(quiz);

    // พยายามลบ lesson ที่เกี่ยวข้อง
    const lesson = await this.lessonRepository.findOne({ where: { lesson_id: lessonId } });
    let lessonRemoved = false;
    if (lesson) {
      await this.lessonRepository.remove(lesson);
      lessonRemoved = true;
    }

    const msg = lessonRemoved
      ? `Quiz ${lessonId} and its lesson were removed successfully.`
      : `Quiz ${lessonId} removed successfully. No lesson found to remove.`;

    return { message: msg };
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

  // ลบ checkpoint ตาม lesson ID
  async removeCheckpointByLessonId(lessonId: number): Promise<void> {
    const checkpoint = await this.findOneCheckpointByLessonId(lessonId);
    await this.checkpointRepository.remove(checkpoint);
  }


  // Checkpoint CRUD operations
  // สร้างหรืออัปเดต checkpoint สำหรับบทเรียน (1 บทเรียน = 1 checkpoint)
  async createCheckpoint(dto: CreateCheckpointDto): Promise<QuizsCheckpoint> {
    const lesson = await this.lessonRepository.findOne({
      where: { lesson_id: dto.lesson_id },
      relations: { chapter: { level: true } },
    });
    if (!lesson) {
      throw new NotFoundException(`Lesson ${dto.lesson_id} not found`);
    }

    if (lesson.lesson_type !== LessonType.CHECKPOINT) {
      throw new BadRequestException('lesson is not type CHECKPOINT');
    }

    const checkpointScore = lesson?.chapter?.level
      ? this.checkpointScoreFromLevelOrderIndex(lesson.chapter.level.level_orderIndex)
      : 5;

    // ตรวจสอบว่ามี checkpoint อยู่แล้วหรือไม่
    const existing = await this.checkpointRepository.findOne({
      where: { lessonId: dto.lesson_id },
      order: { checkpointId: 'DESC' },
    });

    // เตรียมข้อมูลสำหรับสร้างหรืออัปเดต checkpoint
    const data = {
      lessonId: dto.lesson_id,
      checkpointScore,
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
      // relations: { chapter: { level: true } },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    if (lesson.lesson_type !== LessonType.CHECKPOINT) {
      return [];
    }

    // โหลดข้อมูล checkpoint ทั้งหมดของบทเรียนนี้
    const checkpoints = await this.checkpointRepository.find({
      where: { lessonId },
    });

    if (!checkpoints.length) {
      return [];
    }


    // โหลดผลลัพธ์ของผู้ใช้รายคน (per-checkpoint)
    const checkpointIds = checkpoints.map((c) => c.checkpointId);

    const results = await this.resultRepository.find({
      where: {
        userId,
        type: QuizsResultType.CHECKPOINT,
        checkpointId: In(checkpointIds),
      },
    })

    const resultByCheckpointId = new Map(
      results.map((r) => [r.checkpointId, r] as const)
    );

    // รวมข้อมูล checkpoint กับผลลัพธ์ของผู้ใช้ เพื่อส่งกลับไปให้ frontend
    return checkpoints.map((c) => {
      const r = resultByCheckpointId.get(c.checkpointId) ?? null;

      const attempted = r?.userAnswer != null;
      const isCorrect = attempted ? r?.isCorrect === true : false;
      const isSkipped = r?.status === QuizsStatus.SKIPPED;

      const checkpointStatus = isCorrect ? 'COMPLETED' : isSkipped ? 'SKIPPED' : 'PENDING';

      // ถ้ายังไม่เคยตอบ → ไม่ต้องแสดงคำตอบที่ถูกต้องและเฉลย (ตาม requirement)
      const correctScore = c.checkpointScore ?? 5;
      const showSolution = attempted || isSkipped;

      return {
        checkpoint_id: c.checkpointId,
        lesson_id: c.lessonId,
        chapter_id: lesson.chapter_id,
        type: c.checkpointType,
        question: c.checkpointQuestions,
        options: c.checkpointOption ?? null,

        // ข้อมูลสถานะการทำ checkpoint ของผู้ใช้รายคน
        student_progress: {
          correct_answer: showSolution ? c.checkpointAnswer : null,
          user_answer: r?.userAnswer ?? null,
          is_correct: attempted ? (r?.isCorrect ?? null) : null,
          feedback: isSkipped ? 'ข้ามแล้ว' : attempted ? (isCorrect ? 'ผ่านแล้ว' : 'เกือบถูกแล้ว !') : null,
          checkpoint_status: checkpointStatus,
        },

        // ข้อมูลสำหรับแสดงเฉลย (ถ้ายังไม่เคยตอบ จะไม่แสดงเฉลย)
        checkpoint_explanation: showSolution ? (c.checkpointExplanation ?? null) : null,
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
        type: QuizsResultType.CHECKPOINT,
        checkpointId,
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

  private async syncUserXp(
    userId: string,
    chapterId: number,
    lessonId: number,
  ) {
    // Aggregate checkpoints across the whole chapter (all lessons under chapter)
    const lessonsInChapter = await this.lessonRepository.find({
      where: { chapter_id: chapterId },
    });

    const lessonIds = lessonsInChapter.map((l) => l.lesson_id);

    const checkpoints = lessonIds.length
      ? await this.checkpointRepository.find({ where: { lessonId: In(lessonIds) } })
      : [];

    const totalXp = checkpoints.reduce((sum, c) => sum + (c.checkpointScore ?? 5), 0);

    // Load user results for all checkpoints in this chapter
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

    const earnedXp = results.reduce((sum, r) => {
      if (r.isCorrect) {
        const cp = checkpoints.find((c) => c.checkpointId === r.checkpointId);
        return sum + (cp?.checkpointScore ?? 5);
      }
      return sum;
    }, 0);

    let userXp = await this.userXpRepository.findOne({
      where: { userId, chapterId },
    });

    if (!userXp) {
      userXp = this.userXpRepository.create({
        userId,
        chapterId,
        xpEarned: earnedXp,
        xpTotal: totalXp,
        checkpointStatus: earnedXp === totalXp ? 'COMPLETED' : 'PENDING',
        completedAt: earnedXp === totalXp ? new Date() : null,
        lastAttemptAt: new Date(),
      });
    } else {
      userXp.xpEarned = earnedXp;
      userXp.xpTotal = totalXp;
      userXp.lastAttemptAt = new Date();

      if (earnedXp === totalXp && totalXp > 0) {
        userXp.checkpointStatus = 'COMPLETED';
        userXp.completedAt = new Date();
      }
    }

    await this.userXpRepository.save(userXp);
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
    // 1. หา checkpoint
    const checkpoint = await this.checkpointRepository.findOne({
      where: { checkpointId },
    });

    if (!checkpoint) {
      throw new NotFoundException('Checkpoint not found');
    }

    // 2. ตรวจสอบ result เดิม
    const existing = await this.resultRepository.findOne({
      where: {
        userId,
        type: QuizsResultType.CHECKPOINT,
        checkpointId,
      },
    });

    // ถ้าข้ามแล้ว ห้ามตอบ
    if (existing?.status === QuizsStatus.SKIPPED) {
      throw new ConflictException(
        'This checkpoint has been skipped and cannot be answered.',
      );
    }

    // ถ้าตอบถูกแล้ว ห้ามตอบซ้ำ
    if (existing?.isCorrect === true && existing.userAnswer != null) {
      throw new ConflictException(
        'This checkpoint has already been completed.',
      );
    }

    // 3. ตรวจคำตอบ
    const isCorrect = isEqual(checkpoint.checkpointAnswer, answer);
    const correctScore = checkpoint.checkpointScore ?? 5;
    const score = isCorrect ? correctScore : 0;

    // 4. upsert result
    const toSave =
      existing ??
      this.resultRepository.create({
        userId,
        lessonId: checkpoint.lessonId,
        type: QuizsResultType.CHECKPOINT,
        checkpointId,
      });

    toSave.userAnswer = answer;
    toSave.isCorrect = isCorrect;
    toSave.status = isCorrect
      ? QuizsStatus.COMPLETED
      : QuizsStatus.PENDING;

    await this.resultRepository.save(toSave);

    // 5. หา lesson เพื่อ sync XP
    const lesson = await this.lessonRepository.findOne({
      where: { lesson_id: checkpoint.lessonId },
    });

    if (lesson) {
      await this.syncUserXp(
        userId,
        lesson.chapter_id,
        checkpoint.lessonId,
      );
    }

    // 6. ส่ง response กลับ
    return {
      checkpoint_id: checkpoint.checkpointId,
      lesson_id: checkpoint.lessonId,
      chapter_id: lesson?.chapter_id ?? null,
      user_answer: answer,
      is_correct: isCorrect,
      score,
      correct_answer: checkpoint.checkpointAnswer,
      checkpoint_explanation:
        checkpoint.checkpointExplanation ?? null,
      feedback: isCorrect
        ? 'ยอดเยี่ยมมาก !'
        : 'เกือบถูกแล้ว !',
      checkpoint_status: isCorrect
        ? 'COMPLETED'
        : 'PENDING',
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