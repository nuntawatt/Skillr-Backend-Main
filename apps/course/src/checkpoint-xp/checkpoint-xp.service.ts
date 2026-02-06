import { BadRequestException, Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Lesson, LessonType } from '../lessons/entities/lesson.entity';
import { Chapter } from '../chapters/entities/chapter.entity';
import { LessonProgress } from '../progress/entities/lesson-progress.entity';
import { LessonProgressStatus } from '../progress/entities/lesson-progress.entity';
import { UserXp } from './entities/user-xp.entity';
import { CheckpointSubmissionDto, CheckpointResultDto } from './dto';

@Injectable()
export class CheckpointXpService {
  constructor(
    @InjectRepository(UserXp)
    private readonly userXpRepository: Repository<UserXp>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Chapter)
    private readonly chapterRepository: Repository<Chapter>,
    @InjectRepository(LessonProgress)
    private readonly lessonProgressRepository: Repository<LessonProgress>,
    @Inject('DataSource')
    private readonly dataSource: DataSource,
  ) {}

  async submitCheckpoint(userId: string, chapterId: number, dto: CheckpointSubmissionDto): Promise<CheckpointResultDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      // Check if chapter exists
      const chapter = await queryRunner.manager.findOne(Chapter, { where: { chapter_id: chapterId } });
      if (!chapter) {
        throw new NotFoundException(`Chapter with ID ${chapterId} not found`);
      }

      // Check if all lessons in chapter are completed
      const lessons = await queryRunner.manager.find(Lesson, {
        where: { chapter_id: chapterId },
        order: { orderIndex: 'ASC' }
      });

      const checkpointLesson = this.findCheckpointLesson(lessons);
      if (!checkpointLesson) {
        throw new NotFoundException(`Checkpoint lesson for chapter ${chapterId} not found`);
      }

      const requiredLessons = lessons.filter((l) => l.lesson_id !== checkpointLesson.lesson_id);
      const requiredLessonIds = requiredLessons.map((l) => l.lesson_id);

      if (requiredLessonIds.length > 0) {
        const progressRows = await queryRunner.manager.find(LessonProgress, {
          where: { userId, lessonId: In(requiredLessonIds) },
        });

        const completedRequired = progressRows.filter(
          (p) =>
            p.status === LessonProgressStatus.COMPLETED ||
            p.status === LessonProgressStatus.SKIPPED,
        );

        if (completedRequired.length !== requiredLessons.length) {
          throw new BadRequestException('Cannot submit checkpoint: Not all required lessons in chapter are completed');
        }
      }

      // Get or create user XP record
      let userXp = await queryRunner.manager.findOne(UserXp, {
        where: { userId, chapterId }
      });

      if (!userXp) {
        userXp = queryRunner.manager.create(UserXp, {
          userId,
          chapterId,
          xpEarned: 0,
          checkpointStatus: 'PENDING'
        });
      }

      // Check if XP was already earned
      const wasXpAlreadyEarned = userXp.xpEarned > 0;

      // Simple validation: if answers provided, consider it correct
      const isCorrect = this.validateCheckpointAnswers(dto.answers);
      const xpEarned = isCorrect && !wasXpAlreadyEarned ? 5 : 0;

      // Update user XP record
      userXp.lastAttemptAt = new Date();
      if (isCorrect) {
        userXp.checkpointStatus = 'COMPLETED';
        userXp.completedAt = new Date();
        if (!wasXpAlreadyEarned) {
          userXp.xpEarned = xpEarned;
        }
      }

      await queryRunner.manager.save(userXp);

      // Mark checkpoint lesson progress as completed (so Progress roadmap shows it as done)
      let checkpointProgress = await queryRunner.manager.findOne(LessonProgress, {
        where: { userId, lessonId: checkpointLesson.lesson_id },
      });

      if (!checkpointProgress) {
        checkpointProgress = queryRunner.manager.create(LessonProgress, {
          userId,
          lessonId: checkpointLesson.lesson_id,
          status: LessonProgressStatus.IN_PROGRESS,
          progressPercent: 0,
        });
      }

      if (isCorrect) {
        checkpointProgress.status = LessonProgressStatus.COMPLETED;
        checkpointProgress.progressPercent = 100;
        checkpointProgress.completedAt = new Date();
      }

      checkpointProgress.lastViewedAt = new Date();
      await queryRunner.manager.save(checkpointProgress);

      await queryRunner.commitTransaction();

      // Get total XP for this chapter
      const totalChapterXp = userXp.xpEarned;

      return {
        isCorrect,
        xpEarned,
        feedback: isCorrect 
          ? wasXpAlreadyEarned 
            ? 'ผ่านแล้ว +5 XP' 
            : 'ได้รับ 5 XP'
          : 'ตอบผิด ลองใหม่อีกครั้ง',
        totalChapterXp,
        checkpointStatus: userXp.checkpointStatus,
        wasXpAlreadyEarned
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async skipCheckpoint(userId: string, chapterId: number): Promise<CheckpointResultDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      // Check if chapter exists
      const chapter = await queryRunner.manager.findOne(Chapter, { where: { chapter_id: chapterId } });
      if (!chapter) {
        throw new NotFoundException(`Chapter with ID ${chapterId} not found`);
      }

      // Get or create user XP record
      let userXp = await queryRunner.manager.findOne(UserXp, {
        where: { userId, chapterId }
      });

      if (!userXp) {
        userXp = queryRunner.manager.create(UserXp, {
          userId,
          chapterId,
          xpEarned: 0,
          checkpointStatus: 'SKIPPED'
        });
      } else {
        userXp.checkpointStatus = 'SKIPPED';
        userXp.lastAttemptAt = new Date();
      }

      await queryRunner.manager.save(userXp);

      // Also mark the checkpoint lesson progress as SKIPPED for consistency with progress module
      const lessons = await queryRunner.manager.find(Lesson, {
        where: { chapter_id: chapterId },
        order: { orderIndex: 'ASC' }
      });

      const checkpointLesson = this.findCheckpointLesson(lessons);
      if (checkpointLesson) {
        let checkpointProgress = await queryRunner.manager.findOne(LessonProgress, {
          where: { userId, lessonId: checkpointLesson.lesson_id },
        });

        if (!checkpointProgress) {
          checkpointProgress = queryRunner.manager.create(LessonProgress, {
            userId,
            lessonId: checkpointLesson.lesson_id,
            status: LessonProgressStatus.IN_PROGRESS,
            progressPercent: 0,
          });
        }

        checkpointProgress.status = LessonProgressStatus.SKIPPED;
        checkpointProgress.progressPercent = 100;
        checkpointProgress.lastViewedAt = new Date();
        checkpointProgress.completedAt = new Date();
        await queryRunner.manager.save(checkpointProgress);
      }

      await queryRunner.commitTransaction();

      return {
        isCorrect: false,
        xpEarned: 0,
        feedback: 'ข้าม (ไม่ได้ XP)',
        totalChapterXp: userXp.xpEarned,
        checkpointStatus: 'SKIPPED',
        wasXpAlreadyEarned: userXp.xpEarned > 0
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getCheckpointStatus(userId: string, chapterId: number): Promise<CheckpointResultDto> {
    const userXp = await this.userXpRepository.findOne({
      where: { userId, chapterId }
    });

    if (!userXp) {
      return {
        isCorrect: false,
        xpEarned: 0,
        feedback: 'ยังไม่ได้ทำ Checkpoint',
        totalChapterXp: 0,
        checkpointStatus: 'PENDING',
        wasXpAlreadyEarned: false
      };
    }

    const feedback = userXp.checkpointStatus === 'COMPLETED' 
      ? 'ผ่านแล้ว +5 XP'
      : userXp.checkpointStatus === 'SKIPPED'
      ? 'ข้าม (ไม่ได้ XP)'
      : 'ยังไม่ได้ทำ Checkpoint';

    return {
      isCorrect: userXp.checkpointStatus === 'COMPLETED',
      xpEarned: 0,
      feedback,
      totalChapterXp: userXp.xpEarned,
      checkpointStatus: userXp.checkpointStatus,
      wasXpAlreadyEarned: userXp.xpEarned > 0
    };
  }

  // Simple validation logic for checkpoint answers
  private validateCheckpointAnswers(answers: string[]): boolean {
    return answers && answers.length > 0;
  }

  private findCheckpointLesson(lessons: Lesson[]): Lesson | null {
    const checkpoint = lessons.find((l) => l.lesson_type === LessonType.CHECKPOINT);
    if (checkpoint) {
      return checkpoint;
    }

    const quizzes = lessons.filter((l) => l.lesson_type === LessonType.QUIZ);
    return quizzes.length > 0 ? quizzes[quizzes.length - 1] : null;
  }
}
