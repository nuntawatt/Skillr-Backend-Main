import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Lesson } from '../lessons/entities/lesson.entity';
import { Chapter } from '../chapters/entities/chapter.entity';
import { LessonProgress } from '../progress/entities/lesson-progress.entity';
import { LessonProgressStatus } from '../progress/entities/lesson-progress.entity';
import { UserXp } from './entities';
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
  ) {}

  async submitCheckpoint(userId: string, chapterId: number, dto: CheckpointSubmissionDto): Promise<CheckpointResultDto> {
    // Check if chapter exists
    const chapter = await this.chapterRepository.findOne({ where: { chapter_id: chapterId } });
    if (!chapter) {
      throw new NotFoundException(`Chapter with ID ${chapterId} not found`);
    }

    // Check if all lessons in chapter are completed
    const lessons = await this.lessonRepository.find({
      where: { chapter_id: chapterId },
      order: { orderIndex: 'ASC' }
    });

    const lessonIds = lessons.map(l => l.lesson_id);
    const progressRows = await this.lessonProgressRepository.find({
      where: { userId, lessonId: In(lessonIds) },
    });

    const completedLessons = progressRows.filter(p => p.status === LessonProgressStatus.COMPLETED);
    if (completedLessons.length !== lessons.length) {
      throw new Error('Cannot submit checkpoint: Not all lessons in chapter are completed');
    }

    // Get or create user XP record
    let userXp = await this.userXpRepository.findOne({
      where: { userId, chapterId }
    });

    if (!userXp) {
      userXp = this.userXpRepository.create({
        userId,
        chapterId,
        xpEarned: 0,
        checkpointStatus: 'PENDING'
      });
    }

    // Check if XP was already earned
    const wasXpAlreadyEarned = userXp.xpEarned > 0;

    // Simulate checkpoint validation (in real implementation, this would validate against actual quiz data)
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

    await this.userXpRepository.save(userXp);

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
  }

  async skipCheckpoint(userId: string, chapterId: number): Promise<CheckpointResultDto> {
    // Check if chapter exists
    const chapter = await this.chapterRepository.findOne({ where: { chapter_id: chapterId } });
    if (!chapter) {
      throw new NotFoundException(`Chapter with ID ${chapterId} not found`);
    }

    // Get or create user XP record
    let userXp = await this.userXpRepository.findOne({
      where: { userId, chapterId }
    });

    if (!userXp) {
      userXp = this.userXpRepository.create({
        userId,
        chapterId,
        xpEarned: 0,
        checkpointStatus: 'SKIPPED'
      });
    } else {
      userXp.checkpointStatus = 'SKIPPED';
      userXp.lastAttemptAt = new Date();
    }

    await this.userXpRepository.save(userXp);

    return {
      isCorrect: false,
      xpEarned: 0,
      feedback: 'ข้าม (ไม่ได้ XP)',
      totalChapterXp: userXp.xpEarned,
      checkpointStatus: 'SKIPPED',
      wasXpAlreadyEarned: userXp.xpEarned > 0
    };
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
      xpEarned: 0, // XP only awarded on submission
      feedback,
      totalChapterXp: userXp.xpEarned,
      checkpointStatus: userXp.checkpointStatus,
      wasXpAlreadyEarned: userXp.xpEarned > 0
    };
  }

  private validateCheckpointAnswers(answers: string[]): boolean {
    // Simple validation logic - in real implementation, this would check against actual quiz data
    // For now, assume correct if answers array is not empty
    return answers.length > 0;
  }
}
