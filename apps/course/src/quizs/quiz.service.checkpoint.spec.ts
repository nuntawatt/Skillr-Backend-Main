import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { Lesson } from '../lessons/entities/lesson.entity';
import { CreateCheckpointDto } from './dto/create-quizs.dto';
import { QuizService } from './quiz.service';
import { QuizsCheckpoint } from './entities/checkpoint.entity';
import { QuizsResult, QuizsResultType, QuizsStatus } from './entities/quizs-result.entity';
import { Quizs } from './entities/quizs.entity';
import { UserXp } from './entities/user-xp.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

function createMockRepo<T extends ObjectLiteral>(): MockRepo<T> {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => x),
    remove: jest.fn(async (x) => x),
  };
}

describe('QuizService (checkpoint)', () => {
  let service: QuizService;

  let quizsRepository: MockRepo<Quizs>;
  let checkpointRepository: MockRepo<QuizsCheckpoint>;
  let resultRepository: MockRepo<QuizsResult>;
  let lessonRepository: MockRepo<Lesson>;
  let userXpRepository: MockRepo<UserXp>;

  beforeEach(async () => {
    jest.useFakeTimers();

    quizsRepository = createMockRepo<Quizs>();
    checkpointRepository = createMockRepo<QuizsCheckpoint>();
    resultRepository = createMockRepo<QuizsResult>();
    lessonRepository = createMockRepo<Lesson>();
    userXpRepository = createMockRepo<UserXp>();

    const moduleRef = await Test.createTestingModule({
      providers: [
        QuizService,
        { provide: getRepositoryToken(Quizs), useValue: quizsRepository },
        { provide: getRepositoryToken(QuizsCheckpoint), useValue: checkpointRepository },
        { provide: getRepositoryToken(QuizsResult), useValue: resultRepository },
        { provide: getRepositoryToken(Lesson), useValue: lessonRepository },
        { provide: getRepositoryToken(UserXp), useValue: userXpRepository },
      ],
    }).compile();

    service = moduleRef.get(QuizService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('findOneCheckpointById', () => {
    it('returns checkpoint when found', async () => {
      const checkpoint = { checkpointId: 123 } as QuizsCheckpoint;
      checkpointRepository.findOne!.mockResolvedValue(checkpoint);

      await expect(service.findOneCheckpointById(123)).resolves.toBe(checkpoint);
      expect(checkpointRepository.findOne).toHaveBeenCalledWith({ where: { checkpointId: 123 } });
    });

    it('throws NotFoundException when not found', async () => {
      checkpointRepository.findOne!.mockResolvedValue(null);

      await expect(service.findOneCheckpointById(123)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findOneCheckpointByLessonId', () => {
    it('returns checkpoint when found', async () => {
      const checkpoint = { checkpointId: 999, lessonId: 10 } as QuizsCheckpoint;
      checkpointRepository.findOne!.mockResolvedValue(checkpoint);
      lessonRepository.findOne!.mockResolvedValue({ lesson_id: 10, lesson_type: 'checkpoint' } as any);

      await expect(service.findOneCheckpointByLessonId(10)).resolves.toBe(checkpoint);
      expect(checkpointRepository.findOne).toHaveBeenCalledWith({
        where: { lessonId: 10 },
        order: { checkpointId: 'DESC' },
      });
    });

    it('throws NotFoundException when not found', async () => {
      checkpointRepository.findOne!.mockResolvedValue(null);
      await expect(service.findOneCheckpointByLessonId(10)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('createCheckpoint', () => {
    const baseDto: CreateCheckpointDto = {
      lesson_id: 10,
      checkpoint_type: 'multiple_choice' as any,
      checkpoint_questions: '1+1=?',
      checkpoint_option: ['1', '2'],
      checkpoint_answer: 2,
      checkpoint_explanation: '1+1=2',
    };

    it('throws NotFoundException when lesson does not exist', async () => {
      lessonRepository.findOne!.mockResolvedValue(null);

      await expect(service.createCheckpoint(baseDto)).rejects.toBeInstanceOf(NotFoundException);
      expect(checkpointRepository.findOne).not.toHaveBeenCalled();
    });

    it('updates existing checkpoint for lesson', async () => {
      lessonRepository.findOne!.mockResolvedValue({
        lesson_id: 10,
        lesson_type: 'checkpoint',
        chapter: { level: { level_orderIndex: 0 } },
      } as any);

      const existing = {
        checkpointId: 1,
        lessonId: 10,
        checkpointScore: 5,
        checkpointType: 'true_false',
        checkpointQuestions: 'old',
        checkpointOption: null,
        checkpointAnswer: 'False',
        checkpointExplanation: null,
      } as any as QuizsCheckpoint;

      checkpointRepository.findOne!.mockResolvedValue(existing);
      checkpointRepository.save!.mockImplementation(async (x) => x);

      const result = await service.createCheckpoint(baseDto);

      expect(checkpointRepository.save).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        checkpointId: 1,
        lessonId: 10,
        checkpointScore: 5,
        checkpointType: baseDto.checkpoint_type,
        checkpointQuestions: baseDto.checkpoint_questions,
        checkpointOption: baseDto.checkpoint_option,
        checkpointAnswer: baseDto.checkpoint_answer,
        checkpointExplanation: baseDto.checkpoint_explanation,
      });
    });

    it('creates new checkpoint when none exists', async () => {
      lessonRepository.findOne!.mockResolvedValue({
        lesson_id: 10,
        lesson_type: 'checkpoint',
        chapter: { level: { level_orderIndex: 0 } },
      } as any);
      checkpointRepository.findOne!.mockResolvedValue(null);

      const created = {
        checkpointId: 99,
        lessonId: 10,
        checkpointScore: 5,
      } as any as QuizsCheckpoint;

      checkpointRepository.create!.mockReturnValue(created as any);
      checkpointRepository.save!.mockResolvedValue(created);

      const result = await service.createCheckpoint(baseDto);

      expect(checkpointRepository.create).toHaveBeenCalledWith({
        lessonId: 10,
        checkpointScore: 5,
        checkpointType: baseDto.checkpoint_type,
        checkpointQuestions: baseDto.checkpoint_questions,
        checkpointOption: baseDto.checkpoint_option,
        checkpointAnswer: baseDto.checkpoint_answer,
        checkpointExplanation: baseDto.checkpoint_explanation,
      });
      expect(result).toBe(created);
    });
  });

  describe('updateCheckpoint', () => {
    it('throws NotFoundException when checkpoint does not exist', async () => {
      checkpointRepository.findOne!.mockResolvedValue(null);

      await expect(service.updateCheckpoint(1, { checkpoint_questions: 'x' } as any)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('updates fields and saves', async () => {
      const existing = {
        checkpointId: 1,
        lessonId: 10,
        checkpointType: 'multiple_choice',
        checkpointQuestions: 'old',
        checkpointOption: ['a'],
        checkpointAnswer: 'a',
        checkpointExplanation: null,
      } as any as QuizsCheckpoint;

      checkpointRepository.findOne!.mockResolvedValue(existing);
      checkpointRepository.save!.mockImplementation(async (x) => x);

      const updated = await service.updateCheckpoint(1, {
        checkpoint_questions: 'new',
        checkpoint_explanation: 'why',
      } as any);

      expect(checkpointRepository.save).toHaveBeenCalledTimes(1);
      expect(updated).toMatchObject({
        checkpointId: 1,
        checkpointQuestions: 'new',
        checkpointExplanation: 'why',
      });
      expect(updated.checkpointType).toBe('multiple_choice');
    });
  });

  describe('updateCheckpointByLessonId', () => {
    it('throws NotFoundException when checkpoint does not exist for lesson', async () => {
      checkpointRepository.findOne!.mockResolvedValue(null);

      await expect(service.updateCheckpointByLessonId(10, { checkpoint_questions: 'x' } as any)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('updates checkpoint for lesson and saves', async () => {
      const existing = {
        checkpointId: 1,
        lessonId: 10,
        checkpointType: 'multiple_choice',
        checkpointQuestions: 'old',
        checkpointOption: ['a'],
        checkpointAnswer: 'a',
        checkpointExplanation: null,
      } as any as QuizsCheckpoint;

      checkpointRepository.findOne!.mockResolvedValue(existing);
      checkpointRepository.save!.mockImplementation(async (x) => x);

      const updated = await service.updateCheckpointByLessonId(10, {
        checkpoint_questions: 'new',
        checkpoint_explanation: 'why',
      } as any);

      expect(checkpointRepository.save).toHaveBeenCalledTimes(1);
      expect(updated).toMatchObject({
        checkpointId: 1,
        lessonId: 10,
        checkpointQuestions: 'new',
        checkpointExplanation: 'why',
      });
    });
  });

  describe('removeCheckpointByLessonId', () => {
    it('throws NotFoundException when checkpoint does not exist for lesson', async () => {
      checkpointRepository.findOne!.mockResolvedValue(null);
      await expect(service.removeCheckpointByLessonId(10)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('removes checkpoint for lesson', async () => {
      const checkpoint = { checkpointId: 1, lessonId: 10 } as QuizsCheckpoint;
      checkpointRepository.findOne!.mockResolvedValue(checkpoint);
      checkpointRepository.remove!.mockResolvedValue(checkpoint as any);

      await expect(service.removeCheckpointByLessonId(10)).resolves.toBeUndefined();
      expect(checkpointRepository.remove).toHaveBeenCalledWith(checkpoint);
    });
  });

  describe('findCheckpointsByLesson', () => {
    it('returns masked solution when not attempted', async () => {
      lessonRepository.findOne!.mockResolvedValue({
        lesson_id: 10,
        lesson_type: 'checkpoint',
        chapter_id: 7,
        chapter: { level: { level_orderIndex: 1 } },
      } as any);
      checkpointRepository.find!.mockResolvedValue([
        {
          checkpointId: 1,
          lessonId: 10,
          checkpointScore: 10,
          checkpointType: 'multiple_choice',
          checkpointQuestions: 'Q',
          checkpointOption: ['1', '2'],
          checkpointAnswer: '2',
          checkpointExplanation: 'because',
        } as any,
      ]);
      resultRepository.find!.mockResolvedValue([]);

      const rows = await service.findCheckpointsByLesson(10, 'u1');

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        checkpoint_id: 1,
        lesson_id: 10,
        chapter_id: 7,
        student_progress: {
          correct_answer: null,
          user_answer: null,
          is_correct: null,
          checkpoint_status: 'PENDING',
        },
        checkpoint_explanation: null,
        score: null,
      });
    });

    it('returns solution and score when attempted correct (level 2 -> 10)', async () => {
      // derived from lesson.chapter.level.level_orderIndex = 1 -> levelNumber 2 -> score 10
      lessonRepository.findOne!.mockResolvedValue({
        lesson_id: 10,
        lesson_type: 'checkpoint',
        chapter_id: 7,
        chapter: { level: { level_orderIndex: 1 } },
      } as any);
      checkpointRepository.find!.mockResolvedValue([
        {
          checkpointId: 1,
          lessonId: 10,
          checkpointScore: 10,
          checkpointType: 'multiple_choice',
          checkpointQuestions: 'Q',
          checkpointOption: ['1', '2'],
          checkpointAnswer: '2',
          checkpointExplanation: 'because',
        } as any,
      ]);
      resultRepository.find!.mockResolvedValue([
        {
          checkpointId: 1,
          userAnswer: '2',
          isCorrect: true,
          status: QuizsStatus.COMPLETED,
        } as any,
      ]);

      const rows = await service.findCheckpointsByLesson(10, 'u1');

      expect(rows[0].student_progress.correct_answer).toBe('2');
      expect(rows[0].student_progress.is_correct).toBe(true);
      expect(rows[0].student_progress.checkpoint_status).toBe('COMPLETED');
      expect(rows[0].checkpoint_explanation).toBe('because');
      expect(rows[0].score).toBe(10);
    });

    it('returns solution when skipped', async () => {
      lessonRepository.findOne!.mockResolvedValue({
        lesson_id: 10,
        lesson_type: 'checkpoint',
        chapter_id: 7,
        chapter: { level: { level_orderIndex: 2 } },
      } as any);
      checkpointRepository.find!.mockResolvedValue([
        {
          checkpointId: 1,
          lessonId: 10,
          checkpointScore: 15,
          checkpointType: 'multiple_choice',
          checkpointQuestions: 'Q',
          checkpointOption: ['1', '2'],
          checkpointAnswer: '2',
          checkpointExplanation: 'because',
        } as any,
      ]);
      resultRepository.find!.mockResolvedValue([
        {
          checkpointId: 1,
          userAnswer: null,
          isCorrect: null,
          status: QuizsStatus.SKIPPED,
        } as any,
      ]);

      const rows = await service.findCheckpointsByLesson(10, 'u1');

      expect(rows[0].student_progress.correct_answer).toBe('2');
      expect(rows[0].student_progress.feedback).toBe('ข้ามแล้ว');
      expect(rows[0].student_progress.checkpoint_status).toBe('SKIPPED');
      expect(rows[0].score).toBe(0);
    });
  });

  describe('skipCheckpoint', () => {
    it('throws NotFoundException when checkpoint does not exist', async () => {
      checkpointRepository.findOne!.mockResolvedValue(null);

      await expect(service.skipCheckpoint(1, 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException when already completed (answered correctly)', async () => {
      checkpointRepository.findOne!.mockResolvedValue({ checkpointId: 1, lessonId: 10 } as any);
      resultRepository.findOne!.mockResolvedValue({ isCorrect: true, userAnswer: 'x' } as any);

      await expect(service.skipCheckpoint(1, 'u1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('returns previous skipped result without saving', async () => {
      checkpointRepository.findOne!.mockResolvedValue({
        checkpointId: 1,
        lessonId: 10,
        checkpointAnswer: '2',
        checkpointExplanation: 'because',
      } as any);
      resultRepository.findOne!.mockResolvedValue({ status: QuizsStatus.SKIPPED } as any);

      const res = await service.skipCheckpoint(1, 'u1');

      expect(resultRepository.save).not.toHaveBeenCalled();
      expect(res).toMatchObject({
        checkpoint_id: 1,
        lesson_id: 10,
        score: 0,
        correct_answer: '2',
        checkpoint_explanation: 'because',
        feedback: 'ข้ามแล้ว',
        checkpoint_status: 'SKIPPED',
      });
    });

    it('creates skipped result when none exists', async () => {
      checkpointRepository.findOne!.mockResolvedValue({
        checkpointId: 1,
        lessonId: 10,
        checkpointAnswer: '2',
        checkpointExplanation: null,
      } as any);
      resultRepository.findOne!.mockResolvedValue(null);
      resultRepository.create!.mockImplementation((x) => ({ ...x }));
      resultRepository.save!.mockImplementation(async (x) => x);

      const res = await service.skipCheckpoint(1, 'u1');

      expect(resultRepository.save).toHaveBeenCalledTimes(1);
      const saved = (resultRepository.save as jest.Mock).mock.calls[0][0];
      expect(saved).toMatchObject({
        userId: 'u1',
        lessonId: 10,
        type: QuizsResultType.CHECKPOINT,
        checkpointId: 1,
        status: QuizsStatus.SKIPPED,
        userAnswer: null,
        isCorrect: null,
      });

      expect(res.checkpoint_status).toBe('SKIPPED');
      expect(res.correct_answer).toBe('2');
    });
  });

  describe('checkCheckpointAnswer', () => {
    it('throws NotFoundException when checkpoint does not exist', async () => {
      checkpointRepository.findOne!.mockResolvedValue(null);

      await expect(service.checkCheckpointAnswer(1, 'u1', '2')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException when checkpoint already skipped', async () => {
      checkpointRepository.findOne!.mockResolvedValue({ checkpointId: 1, lessonId: 10 } as any);
      resultRepository.findOne!.mockResolvedValue({ status: QuizsStatus.SKIPPED } as any);

      await expect(service.checkCheckpointAnswer(1, 'u1', '2')).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws ConflictException when already completed correctly with an answer', async () => {
      checkpointRepository.findOne!.mockResolvedValue({ checkpointId: 1, lessonId: 10 } as any);
      resultRepository.findOne!.mockResolvedValue({ isCorrect: true, userAnswer: '2' } as any);

      await expect(service.checkCheckpointAnswer(1, 'u1', '2')).rejects.toBeInstanceOf(ConflictException);
    });

    it('saves COMPLETED result and syncs userXp on correct answer (string number equals number)', async () => {
      jest.setSystemTime(new Date('2026-02-19T00:00:00.000Z'));

      checkpointRepository.findOne!.mockResolvedValue({
        checkpointId: 1,
        lessonId: 10,
        checkpointScore: 5,
        checkpointAnswer: 2,
        checkpointExplanation: 'ok',
      } as any);
      resultRepository.findOne!.mockResolvedValue(null);
      lessonRepository.findOne!.mockResolvedValue({
        lesson_id: 10,
        chapter_id: 7,
      } as any);

      resultRepository.create!.mockImplementation((x) => ({ ...x }));
      resultRepository.save!.mockImplementation(async (x) => x);

      userXpRepository.findOne!.mockResolvedValue({ userId: 'u1', chapterId: 7, xpEarned: 0 } as any);
      userXpRepository.save!.mockImplementation(async (x) => x);

      const res = await service.checkCheckpointAnswer(1, 'u1', '2');

      expect(resultRepository.save).toHaveBeenCalledTimes(1);
      const savedResult = (resultRepository.save as jest.Mock).mock.calls[0][0];
      expect(savedResult).toMatchObject({
        type: QuizsResultType.CHECKPOINT,
        checkpointId: 1,
        lessonId: 10,
        userId: 'u1',
        status: QuizsStatus.COMPLETED,
        isCorrect: true,
        userAnswer: '2',
      });

      expect(userXpRepository.save).toHaveBeenCalledTimes(1);
      const savedXp = (userXpRepository.save as jest.Mock).mock.calls[0][0];
      expect(savedXp).toMatchObject({
        userId: 'u1',
        chapterId: 7,
        checkpointStatus: 'COMPLETED',
        xpEarned: 5,
      });

      expect(res).toMatchObject({
        checkpoint_id: 1,
        lesson_id: 10,
        chapter_id: 7,
        is_correct: true,
        score: 5,
        correct_answer: 2,
        checkpoint_explanation: 'ok',
        checkpoint_status: 'COMPLETED',
        feedback: 'ยอดเยี่ยมมาก !',
      });
    });

    it('uses persisted checkpointScore to determine score and first-time XP (score 10)', async () => {
      jest.setSystemTime(new Date('2026-02-19T00:00:00.000Z'));

      checkpointRepository.findOne!.mockResolvedValue({
        checkpointId: 1,
        lessonId: 10,
        checkpointScore: 10,
        checkpointAnswer: 'A',
        checkpointExplanation: null,
      } as any);
      resultRepository.findOne!.mockResolvedValue(null);
      lessonRepository.findOne!.mockResolvedValue({
        lesson_id: 10,
        chapter_id: 7,
      } as any);

      resultRepository.create!.mockImplementation((x) => ({ ...x }));
      resultRepository.save!.mockImplementation(async (x) => x);

      userXpRepository.findOne!.mockResolvedValue({ userId: 'u1', chapterId: 7, xpEarned: 0 } as any);
      userXpRepository.save!.mockImplementation(async (x) => x);

      const res = await service.checkCheckpointAnswer(1, 'u1', 'A');

      expect(res).toMatchObject({
        is_correct: true,
        score: 10,
        checkpoint_status: 'COMPLETED',
      });

      const savedXp = (userXpRepository.save as jest.Mock).mock.calls[0][0];
      expect(savedXp).toMatchObject({ xpEarned: 10, checkpointStatus: 'COMPLETED' });
    });

    it('returns chapter_id null and does not sync userXp when lesson not found', async () => {
      checkpointRepository.findOne!.mockResolvedValue({
        checkpointId: 1,
        lessonId: 10,
        checkpointScore: 5,
        checkpointAnswer: 'A',
        checkpointExplanation: null,
      } as any);
      resultRepository.findOne!.mockResolvedValue(null);
      lessonRepository.findOne!.mockResolvedValue(null);

      resultRepository.create!.mockImplementation((x) => ({ ...x }));
      resultRepository.save!.mockImplementation(async (x) => x);

      const res = await service.checkCheckpointAnswer(1, 'u1', 'A');

      expect(userXpRepository.findOne).not.toHaveBeenCalled();
      expect(userXpRepository.save).not.toHaveBeenCalled();

      expect(res).toMatchObject({
        checkpoint_id: 1,
        lesson_id: 10,
        chapter_id: null,
        is_correct: true,
        score: 5,
        checkpoint_status: 'COMPLETED',
        feedback: 'ผ่านแล้ว แต่ไม่สามารถให้ XP ได้',
      });
    });

    it('keeps userXp xpEarned when answer is wrong', async () => {
      jest.setSystemTime(new Date('2026-02-19T00:00:00.000Z'));

      checkpointRepository.findOne!.mockResolvedValue({
        checkpointId: 1,
        lessonId: 10,
        checkpointScore: 15,
        checkpointAnswer: 'A',
        checkpointExplanation: 'why',
      } as any);
      resultRepository.findOne!.mockResolvedValue(null);
      lessonRepository.findOne!.mockResolvedValue({
        lesson_id: 10,
        chapter_id: 7,
      } as any);

      resultRepository.create!.mockImplementation((x) => ({ ...x }));
      resultRepository.save!.mockImplementation(async (x) => x);

      userXpRepository.findOne!.mockResolvedValue({ userId: 'u1', chapterId: 7, xpEarned: 10, checkpointStatus: 'PENDING' } as any);
      userXpRepository.save!.mockImplementation(async (x) => x);

      const res = await service.checkCheckpointAnswer(1, 'u1', 'B');

      const savedResult = (resultRepository.save as jest.Mock).mock.calls[0][0];
      expect(savedResult).toMatchObject({
        status: QuizsStatus.PENDING,
        isCorrect: false,
      });

      const savedXp = (userXpRepository.save as jest.Mock).mock.calls[0][0];
      expect(savedXp).toMatchObject({ xpEarned: 10, checkpointStatus: 'PENDING' });

      expect(res).toMatchObject({
        is_correct: false,
        score: 0,
        checkpoint_status: 'PENDING',
        feedback: 'เกือบถูกแล้ว !',
      });
    });
  });
});
