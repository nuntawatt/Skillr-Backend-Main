import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChapterProgress } from './entities/chapter-progress.entity';
import { ItemProgress, ItemStatus, ItemType } from './entities/item-progress.entity';
import { CourseClientService } from './course-client.service';

export interface ChapterProgressSummary {
  chapterProgress: ChapterProgress;
  items: ItemProgress[];
  chapterTitle: string;
  chapterOrder: number;
}

@Injectable()
export class ChapterProgressService {
  constructor(
    @InjectRepository(ChapterProgress, 'learning')
    private readonly chapterProgressRepo: Repository<ChapterProgress>,

    @InjectRepository(ItemProgress, 'learning')
    private readonly itemProgressRepo: Repository<ItemProgress>,

    private readonly courseClient: CourseClientService,
  ) {}

  async getChapterRoadmap(userId: string, chapterId: number): Promise<ChapterProgressSummary> {
    const chapter = await this.courseClient.getChapterById(chapterId);
    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }

    const chapterProgress = await this.getOrCreateChapterProgress(userId, chapterId);
    const items = await this.getChapterItemsWithProgress(userId, chapterId);

    return {
      chapterProgress,
      items,
      chapterTitle: chapter.chapter_title,
      chapterOrder: chapter.chapter_orderIndex,
    };
  }

  async completeItem(
    userId: string,
    itemId: number,
    timeSpentSeconds: number = 0,
    quizSkipped: boolean = false,
  ): Promise<{ itemProgress: ItemProgress; chapterProgress: ChapterProgress }> {
    const lesson = await this.courseClient.getLessonById(itemId);
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const itemProgress = await this.getOrCreateItemProgress(userId, itemId, lesson.chapter_id, lesson.lesson_type as ItemType, lesson.orderIndex);
    
    if (itemProgress.status === ItemStatus.COMPLETED) {
      throw new BadRequestException('Item already completed');
    }

    const now = new Date();
    
    itemProgress.status = ItemStatus.COMPLETED;
    itemProgress.completedAt = now;
    itemProgress.timeSpentSeconds += timeSpentSeconds;
    itemProgress.quizSkipped = quizSkipped;
    itemProgress.updatedAt = now;

    await this.itemProgressRepo.save(itemProgress);

    const chapterProgress = await this.updateChapterProgress(userId, lesson.chapter_id);

    await this.unlockNextItem(userId, lesson.chapter_id, lesson.orderIndex);

    return { itemProgress, chapterProgress };
  }

  async startItem(userId: string, itemId: number): Promise<ItemProgress> {
    const lesson = await this.courseClient.getLessonById(itemId);
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const itemProgress = await this.getOrCreateItemProgress(userId, itemId, lesson.chapter_id, lesson.lesson_type as ItemType, lesson.orderIndex);
    
    if (itemProgress.status === ItemStatus.LOCKED) {
      throw new BadRequestException('Item is locked');
    }

    if (!itemProgress.startedAt) {
      itemProgress.startedAt = new Date();
      itemProgress.status = ItemStatus.CURRENT;
      itemProgress.updatedAt = new Date();
      await this.itemProgressRepo.save(itemProgress);
    }

    return itemProgress;
  }

  private async getOrCreateChapterProgress(userId: string, chapterId: number): Promise<ChapterProgress> {
    let chapterProgress = await this.chapterProgressRepo.findOne({
      where: { userId, chapterId },
    });

    if (!chapterProgress) {
      const lessons = await this.courseClient.getChapterLessons(chapterId);
      const totalItems = lessons?.length || 0;

      chapterProgress = this.chapterProgressRepo.create({
        userId,
        chapterId,
        totalItems,
        completedItems: 0,
        progressPercentage: 0,
        checkpointUnlocked: false,
        updatedAt: new Date(),
      });

      await this.chapterProgressRepo.save(chapterProgress);
    }

    return chapterProgress;
  }

  private async getOrCreateItemProgress(
    userId: string,
    itemId: number,
    chapterId: number,
    itemType: ItemType,
    orderIndex: number,
  ): Promise<ItemProgress> {
    let itemProgress = await this.itemProgressRepo.findOne({
      where: { userId, itemId },
    });

    if (!itemProgress) {
      const isFirstItem = orderIndex === 0;
      const status = isFirstItem ? ItemStatus.CURRENT : ItemStatus.LOCKED;

      itemProgress = this.itemProgressRepo.create({
        userId,
        itemId,
        chapterId,
        status,
        itemType,
        orderIndex,
        updatedAt: new Date(),
      });

      await this.itemProgressRepo.save(itemProgress);
    }

    return itemProgress;
  }

  private async getChapterItemsWithProgress(userId: string, chapterId: number): Promise<ItemProgress[]> {
    const lessons = await this.courseClient.getChapterLessons(chapterId);
    if (!lessons || lessons.length === 0) {
      return [];
    }

    const itemProgresses = await this.itemProgressRepo.find({
      where: { userId, chapterId },
      order: { orderIndex: 'ASC' },
    });

    const progressMap = new Map(itemProgresses.map(p => [p.itemId, p]));

    const items: ItemProgress[] = [];
    let hasCurrent = false;

    for (const lesson of lessons.sort((a, b) => a.orderIndex - b.orderIndex)) {
      let progress = progressMap.get(lesson.lesson_id);
      
      if (!progress) {
        const isFirstItem = lesson.orderIndex === 0;
        const status = isFirstItem ? ItemStatus.CURRENT : ItemStatus.LOCKED;
        
        progress = this.itemProgressRepo.create({
          userId,
          itemId: lesson.lesson_id,
          chapterId,
          status,
          itemType: lesson.lesson_type as ItemType,
          orderIndex: lesson.orderIndex,
          updatedAt: new Date(),
        });
        
        await this.itemProgressRepo.save(progress);
      }

      if (progress.status === ItemStatus.CURRENT) {
        hasCurrent = true;
      } else if (progress.status === ItemStatus.LOCKED && hasCurrent) {
        progress.status = ItemStatus.CURRENT;
        await this.itemProgressRepo.save(progress);
        hasCurrent = true;
      }

      items.push(progress);
    }

    return items;
  }

  private async updateChapterProgress(userId: string, chapterId: number): Promise<ChapterProgress> {
    const chapterProgress = await this.getOrCreateChapterProgress(userId, chapterId);
    
    const completedItems = await this.itemProgressRepo.count({
      where: { 
        userId, 
        chapterId, 
        status: ItemStatus.COMPLETED 
      },
    });

    const progressPercentage = chapterProgress.totalItems > 0 
      ? Math.min(100, (completedItems / chapterProgress.totalItems) * 100)
      : 0;

    const checkpointUnlocked = completedItems >= chapterProgress.totalItems;

    chapterProgress.completedItems = completedItems;
    chapterProgress.progressPercentage = progressPercentage;
    chapterProgress.checkpointUnlocked = checkpointUnlocked;
    chapterProgress.updatedAt = new Date();

    await this.chapterProgressRepo.save(chapterProgress);

    return chapterProgress;
  }

  private async unlockNextItem(userId: string, chapterId: number, completedOrderIndex: number): Promise<void> {
    const nextItem = await this.itemProgressRepo.findOne({
      where: {
        userId,
        chapterId,
        orderIndex: completedOrderIndex + 1,
        status: ItemStatus.LOCKED,
      },
    });

    if (nextItem) {
      nextItem.status = ItemStatus.CURRENT;
      nextItem.updatedAt = new Date();
      await this.itemProgressRepo.save(nextItem);
    }
  }

  async skipQuiz(userId: string, itemId: number): Promise<{ itemProgress: ItemProgress; chapterProgress: ChapterProgress }> {
    return this.completeItem(userId, itemId, 0, true);
  }

  async getChapterProgress(userId: string, chapterId: number): Promise<ChapterProgress> {
    const chapterProgress = await this.chapterProgressRepo.findOne({
      where: { userId, chapterId },
    });

    if (!chapterProgress) {
      throw new NotFoundException('Chapter progress not found');
    }

    return chapterProgress;
  }

  async getAllChaptersProgress(userId: string): Promise<ChapterProgress[]> {
    return this.chapterProgressRepo.find({
      where: { userId },
      order: { chapterId: 'ASC' },
    });
  }
}
