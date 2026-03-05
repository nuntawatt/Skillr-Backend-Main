import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { LessonsService } from './lessons.service';
import { Lesson, LessonType } from './entities/lesson.entity';
import { Chapter } from '../chapters/entities/chapter.entity';
import { Article } from '../articles/entities/article.entity';
import { Quizs } from '../quizs/entities/quizs.entity';
import { QuizsCheckpoint } from '../quizs/entities/checkpoint.entity';
import { VideoAsset } from '../media-videos/entities/video.entity';

describe('LessonsService', () => {
  let service: LessonsService;

  type LessonRepoMock = {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
    exist: jest.Mock;
    update: jest.Mock;
  };

  type ChapterRepoMock = {
    findOne: jest.Mock;
    update: jest.Mock;
  };

  type ArticleRepoMock = {
    findOne: jest.Mock;
  };

  type QuizRepoMock = {
    findOne: jest.Mock;
  };

  type CheckpointRepoMock = {
    findOne: jest.Mock;
    exist: jest.Mock;
  };

  type VideoRepoMock = {
    findOne: jest.Mock;
  };

  let lessonRepo: LessonRepoMock;
  let chapterRepo: ChapterRepoMock;
  let articleRepo: ArticleRepoMock;
  let quizRepo: QuizRepoMock;
  let checkpointRepo: CheckpointRepoMock;
  let videoRepo: VideoRepoMock;

  const fixedNow = new Date('2026-03-05T00:00:00.000Z');

  const makeLesson = (overrides: Partial<Lesson> = {}): Lesson =>
    ({
      lesson_id: 1,
      lesson_title: 'T',
      lesson_description: null,
      lesson_type: LessonType.ARTICLE,
      orderIndex: 0,
      chapter_id: 10,
      lesson_ImageUrl: null as any,
      lesson_videoUrl: null as any,
      isPublished: false,
      createdAt: fixedNow,
      chapter: undefined as any,
      ...overrides,
    }) as Lesson;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonsService,
        {
          provide: getRepositoryToken(Lesson),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            exist: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Chapter),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Article),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Quizs),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(QuizsCheckpoint),
          useValue: { findOne: jest.fn(), exist: jest.fn() },
        },
        {
          provide: getRepositoryToken(VideoAsset),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(LessonsService);
    lessonRepo = module.get(getRepositoryToken(Lesson));
    chapterRepo = module.get(getRepositoryToken(Chapter));
    articleRepo = module.get(getRepositoryToken(Article));
    quizRepo = module.get(getRepositoryToken(Quizs));
    checkpointRepo = module.get(getRepositoryToken(QuizsCheckpoint));
    videoRepo = module.get(getRepositoryToken(VideoAsset));
    jest.clearAllMocks();

    // default syncChapterIsPublished path
    lessonRepo.exist!.mockResolvedValue(false);
    chapterRepo.update!.mockResolvedValue({} as any);
  });

  describe('create', () => {
    it('throws when chapter not found', async () => {
      chapterRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.create({ chapter_id: 999, lesson_title: 'x', lesson_type: LessonType.ARTICLE } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('inserts non-checkpoint before existing checkpoint and shifts checkpoint down', async () => {
      chapterRepo.findOne!.mockResolvedValue({ chapter_id: 10 } as any);

      const existingCheckpoint = makeLesson({ lesson_id: 2, lesson_type: LessonType.CHECKPOINT, orderIndex: 1 });
      lessonRepo.find!.mockResolvedValue([makeLesson({ lesson_id: 1, orderIndex: 0 }), existingCheckpoint]);

      lessonRepo.save!.mockImplementation(async (l: any) => l);

      const newLesson = makeLesson({ lesson_id: 3, lesson_type: LessonType.ARTICLE, orderIndex: 1, isPublished: true });
      lessonRepo.create!.mockReturnValue(newLesson);

      (lessonRepo.save as jest.Mock)
        .mockResolvedValueOnce(existingCheckpoint) // save shifted checkpoint
        .mockResolvedValueOnce(newLesson); // save new lesson

      const result = await service.create({
        chapter_id: 10,
        lesson_title: 'New',
        lesson_type: LessonType.ARTICLE,
        isPublished: true,
      } as any);

      expect(existingCheckpoint.orderIndex).toBe(2);
      expect(result.orderIndex).toBe(1);
      expect(chapterRepo.update).toHaveBeenCalled();
    });

    it('replaces existing checkpoint when creating checkpoint (removes old, puts at end)', async () => {
      chapterRepo.findOne!.mockResolvedValue({ chapter_id: 10 } as any);

      const existingCheckpoint = makeLesson({ lesson_id: 2, lesson_type: LessonType.CHECKPOINT, orderIndex: 1 });
      lessonRepo.find!.mockResolvedValue([makeLesson({ lesson_id: 1, orderIndex: 0 }), existingCheckpoint]);

      lessonRepo.remove!.mockResolvedValue(existingCheckpoint);

      const checkpointLesson = makeLesson({ lesson_id: 3, lesson_type: LessonType.CHECKPOINT, orderIndex: 1, isPublished: false });
      lessonRepo.create!.mockReturnValue(checkpointLesson);
      lessonRepo.save!.mockResolvedValue(checkpointLesson);

      const result = await service.create({
        chapter_id: 10,
        lesson_title: 'CP',
        lesson_type: LessonType.CHECKPOINT,
      } as any);

      expect(lessonRepo.remove).toHaveBeenCalledWith(existingCheckpoint);
      expect(result.orderIndex).toBe(1);
      expect(result.isPublished).toBe(false);
    });
  });

  describe('findByChapter / findPublishedByChapter', () => {
    it('findByChapter maps list', async () => {
      lessonRepo.find!.mockResolvedValue([makeLesson({ lesson_id: 1 })]);
      checkpointRepo.findOne!.mockResolvedValue(null);

      const result = await service.findByChapter(10);
      expect(lessonRepo.find).toHaveBeenCalledWith({ where: { chapter_id: 10 }, order: { orderIndex: 'ASC' } });
      expect(result).toHaveLength(1);
    });

    it('findPublishedByChapter filters isPublished', async () => {
      lessonRepo.find!.mockResolvedValue([makeLesson({ lesson_id: 1, isPublished: true })]);
      checkpointRepo.findOne!.mockResolvedValue(null);

      const result = await service.findPublishedByChapter(10);
      expect(lessonRepo.find).toHaveBeenCalledWith({
        where: { chapter_id: 10, isPublished: true },
        order: { orderIndex: 'ASC' },
      });
      expect(result[0].isPublished).toBe(true);
    });
  });

  describe('findAll / findAllPublished', () => {
    it('findAll returns list', async () => {
      lessonRepo.find!.mockResolvedValue([makeLesson({ lesson_id: 1 })]);
      checkpointRepo.findOne!.mockResolvedValue(null);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });

    it('findAllPublished filters isPublished', async () => {
      lessonRepo.find!.mockResolvedValue([makeLesson({ lesson_id: 1, isPublished: true })]);
      checkpointRepo.findOne!.mockResolvedValue(null);
      const result = await service.findAllPublished();
      expect(lessonRepo.find).toHaveBeenCalledWith({ where: { isPublished: true }, order: { orderIndex: 'ASC' } });
      expect(result[0].isPublished).toBe(true);
    });
  });

  describe('findOne / findOnePublished / findOneAdmin', () => {
    it('findOne throws when lesson not found', async () => {
      lessonRepo.findOne!.mockResolvedValue(null);
      await expect(service.findOne(1)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('findOne throws when draft ARTICLE has no content', async () => {
      lessonRepo.findOne!.mockResolvedValue(makeLesson({ lesson_id: 1, lesson_type: LessonType.ARTICLE, isPublished: false }));
      articleRepo.findOne!.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('findOnePublished throws when not found', async () => {
      lessonRepo.findOne!.mockResolvedValue(null);
      await expect(service.findOnePublished(1)).rejects.toBeInstanceOf(NotFoundException);

      expect(lessonRepo.findOne).toHaveBeenCalledWith({ where: { lesson_id: 1, isPublished: true } });
    });

    it('findOneAdmin returns dto', async () => {
      lessonRepo.findOne!.mockResolvedValue(makeLesson({ lesson_id: 1 }));
      checkpointRepo.findOne!.mockResolvedValue(null);
      const result = await service.findOneAdmin(1);
      expect(result.lesson_id).toBe(1);
    });
  });

  describe('update', () => {
    it('throws when not found', async () => {
      lessonRepo.findOne!.mockResolvedValue(null);
      await expect(service.update(1, { lesson_title: 'x' } as any)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws when trying to publish checkpoint without content', async () => {
      const lesson = makeLesson({ lesson_id: 1, lesson_type: LessonType.CHECKPOINT, isPublished: false });
      lessonRepo.findOne!.mockResolvedValue(lesson);
      (checkpointRepo.exist as jest.Mock).mockResolvedValue(false);

      await expect(service.update(1, { isPublished: true } as any)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates non-checkpoint and auto-publishes by default', async () => {
      const lesson = makeLesson({ lesson_id: 1, lesson_type: LessonType.ARTICLE, isPublished: false });
      lessonRepo.findOne!.mockResolvedValue(lesson);
      lessonRepo.save!.mockImplementation(async (l) => l as any);

      const result = await service.update(1, { lesson_title: 'New' } as any);

      expect(lesson.isPublished).toBe(true);
      expect(result.lesson_title).toBe('New');
      expect(chapterRepo.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('throws when not found', async () => {
      lessonRepo.findOne!.mockResolvedValue(null);
      await expect(service.remove(1)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('removes and syncs chapter publish state', async () => {
      const lesson = makeLesson({ lesson_id: 1, chapter_id: 10 });
      lessonRepo.findOne!.mockResolvedValue(lesson);
      lessonRepo.remove!.mockResolvedValue(lesson);

      const result = await service.remove(1);

      expect(lessonRepo.remove).toHaveBeenCalledWith(lesson);
      expect(chapterRepo.update).toHaveBeenCalledWith(10, { isPublished: false });
      expect(result.message).toContain('deleted successfully');
    });
  });

  describe('reorder', () => {
    it('returns [] when no lessons', async () => {
      lessonRepo.find!.mockResolvedValue([]);
      const result = await service.reorder(10, [1]);
      expect(result).toEqual([]);
    });

    it('throws when checkpoint is not last', async () => {
      const checkpoint = makeLesson({ lesson_id: 2, lesson_type: LessonType.CHECKPOINT });
      lessonRepo.find!.mockResolvedValue([makeLesson({ lesson_id: 1 }), checkpoint]);

      await expect(service.reorder(10, [2, 1])).rejects.toBeInstanceOf(BadRequestException);
    });

    it('saves updated order and returns findByChapter', async () => {
      const l1 = makeLesson({ lesson_id: 1, orderIndex: 0 });
      const l2 = makeLesson({ lesson_id: 2, orderIndex: 1 });
      lessonRepo.find!.mockResolvedValue([l1, l2]);
      lessonRepo.save!.mockResolvedValue([l1, l2] as any);

      jest.spyOn(service, 'findByChapter').mockResolvedValue([
        { lesson_id: 2 } as any,
        { lesson_id: 1 } as any,
      ]);

      const result = await service.reorder(10, [2, 1]);

      expect(lessonRepo.save).toHaveBeenCalledWith([expect.any(Object), expect.any(Object)]);
      expect(result[0].lesson_id).toBe(2);
    });
  });
});
