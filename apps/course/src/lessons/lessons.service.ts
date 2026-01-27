import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Lesson, LessonType, LessonRefSource } from './entities/lesson.entity';
import { Chapter } from '../chapters/entities/chapter.entity';
import { Article } from '../articles/entities/article.entity';
import { CreateLessonDto, UpdateLessonDto, LessonResponseDto } from './dto/lesson';

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Chapter)
    private readonly chapterRepository: Repository<Chapter>,
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    private readonly dataSource: DataSource,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Create a new lesson for a chapter
   * For article type, also creates the Article entity in a transaction
   */
  async create(createLessonDto: CreateLessonDto): Promise<LessonResponseDto> {
    // Verify chapter exists
    const chapter = await this.chapterRepository.findOne({
      where: { chapter_id: createLessonDto.chapterId },
    });

    if (!chapter) {
      throw new NotFoundException(`Chapter with ID ${createLessonDto.chapterId} not found`);
    }

    // Validate refSource matches type
    if (createLessonDto.type === LessonType.ARTICLE && createLessonDto.refSource !== LessonRefSource.COURSE) {
      throw new BadRequestException('Article lessons must have refSource = course');
    }

    if (createLessonDto.type === LessonType.VIDEO && createLessonDto.refSource !== LessonRefSource.MEDIA) {
      throw new BadRequestException('Video lessons must have refSource = media');
    }

    if (createLessonDto.type === LessonType.QUIZ && createLessonDto.refSource !== LessonRefSource.QUIZ) {
      throw new BadRequestException('Quiz lessons must have refSource = quiz');
    }

    // Auto-generate orderIndex if not provided
    let orderIndex = createLessonDto.orderIndex;
    if (orderIndex === undefined) {
      const maxOrderResult = await this.lessonRepository
        .createQueryBuilder('lesson')
        .where('lesson.chapter_id = :chapterId', { chapterId: createLessonDto.chapterId })
        .select('MAX(lesson.order_index)', 'maxOrder')
        .getRawOne();
      orderIndex = (maxOrderResult?.maxOrder ?? -1) + 1;
    }

    const lesson = this.lessonRepository.create({
      lesson_title: createLessonDto.title,
      lesson_description: createLessonDto.description,
      chapter_id: createLessonDto.chapterId,
      type: createLessonDto.type,
      ref_source: createLessonDto.refSource,
      ref_id: createLessonDto.refId,
      order_index: orderIndex,
    });

    const saved = await this.lessonRepository.save(lesson);
    return this.toResponseDto(saved);
  }

  /**
   * Create an article lesson with content in a single transaction
   */
  async createArticleLesson(
    createLessonDto: Omit<CreateLessonDto, 'type' | 'refSource' | 'refId'>,
    content: any,
  ): Promise<LessonResponseDto> {
    return await this.dataSource.transaction(async (manager) => {
      // Verify chapter exists
      const chapter = await manager.findOne(Chapter, {
        where: { chapter_id: createLessonDto.chapterId },
      });

      if (!chapter) {
        throw new NotFoundException(`Chapter with ID ${createLessonDto.chapterId} not found`);
      }

      // Auto-generate orderIndex if not provided
      let orderIndex = createLessonDto.orderIndex;
      if (orderIndex === undefined) {
        const maxOrderResult = await manager
          .createQueryBuilder(Lesson, 'lesson')
          .where('lesson.chapter_id = :chapterId', { chapterId: createLessonDto.chapterId })
          .select('MAX(lesson.order_index)', 'maxOrder')
          .getRawOne();
        orderIndex = (maxOrderResult?.maxOrder ?? -1) + 1;
      }

      // Create article first to get its ID
      const article = manager.create(Article, {
        content,
        lessonId: 0, // Will be updated after lesson creation
      });

      // We need to save the lesson first to get its ID
      const lesson = manager.create(Lesson, {
        lesson_title: createLessonDto.title,
        lesson_description: createLessonDto.description,
        chapter_id: createLessonDto.chapterId,
        type: LessonType.ARTICLE,
        ref_source: LessonRefSource.COURSE,
        ref_id: 0, // Will be updated
        order_index: orderIndex,
      });

      const savedLesson = await manager.save(lesson);

      // Now create the article with the lesson ID
      article.lessonId = savedLesson.lesson_id;
      const savedArticle = await manager.save(article);

      // Update the lesson with the article's ID
      savedLesson.ref_id = savedArticle.article_id;
      await manager.save(savedLesson);

      return this.toResponseDto(savedLesson);
    });
  }

  /**
   * Find all lessons for a chapter
   */
  async findByChapter(chapterId: number): Promise<LessonResponseDto[]> {
    const lessons = await this.lessonRepository.find({
      where: { chapter_id: chapterId },
      order: { order_index: 'ASC' },
    });

    return lessons.map((l) => this.toResponseDto(l));
  }

  /**
   * Find a single lesson by ID
   */
  async findOne(id: number): Promise<LessonResponseDto> {
    const lesson = await this.lessonRepository.findOne({ where: { lesson_id: id } });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    return this.toResponseDto(lesson);
  }

  // Check if student can access this lesson by checking completion of the previous lesson
  async validateLessonAccess(lessonId: number, userId: string): Promise<void> {
    const currentLesson = await this.lessonRepository.findOne({ 
      where: { id: lessonId },
      relations: ['chapter']
    });

    if (!currentLesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    const previousLesson = await this.getPreviousLesson(currentLesson);
    if (!previousLesson) {
      // First lesson of the course, allowed
      return;
    }

    // Check if previous lesson is completed in learning service
    const learningServiceUrl = process.env.LEARNING_SERVICE_URL || 'http://localhost:3005';
    
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${learningServiceUrl}/learning/lessons/${previousLesson.id}/progress`, {
          headers: { 'x-user-id': userId }
        })
      );
      
      const progress = response.data;
      if (!progress || !progress.completedAt) {
        throw new ForbiddenException({
          message: 'Please complete the previous lesson first.',
          previousLessonId: previousLesson.id,
          previousLessonTitle: previousLesson.title
        });
      }
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      
      // If progress record doesn't exist at all, it's definitely not completed
      throw new ForbiddenException({
        message: 'Please complete the previous lesson first.',
        previousLessonId: previousLesson.id,
        previousLessonTitle: previousLesson.title
      });
    }
  }

  // Helper to find the previous lesson
  private async getPreviousLesson(lesson: Lesson): Promise<Lesson | null> {
    // 1. Check if there's a lesson with a smaller orderIndex in the same chapter
    const prevInChapter = await this.lessonRepository.findOne({
      where: {
        chapterId: lesson.chapterId,
        orderIndex: lesson.orderIndex - 1 // Simplified assuming consecutive indexes, but let's be safer
      },
      order: { orderIndex: 'DESC' }
    });

    if (prevInChapter) return prevInChapter;

    // Alternative safer way if orderIndex is not exactly -1
    const prevInChapterSafer = await this.lessonRepository.findOne({
      where: {
        chapterId: lesson.chapterId,
        orderIndex: this.dataSource.getRepository(Lesson).createQueryBuilder().select('MAX(order_index)').where('chapter_id = :chapterId AND order_index < :orderIndex', { chapterId: lesson.chapterId, orderIndex: lesson.orderIndex }).getQuery() as any
      }
    });
    // Let's use a simpler query builder approach
    const prevInChapterFinal = await this.lessonRepository
      .createQueryBuilder('lesson')
      .where('lesson.chapterId = :chapterId', { chapterId: lesson.chapterId })
      .andWhere('lesson.orderIndex < :orderIndex', { orderIndex: lesson.orderIndex })
      .orderBy('lesson.orderIndex', 'DESC')
      .getOne();

    if (prevInChapterFinal) return prevInChapterFinal;

    // 2. If it's the first lesson in the chapter, check the previous chapter
    const currentChapter = lesson.chapter;
    const prevChapter = await this.chapterRepository
      .createQueryBuilder('chapter')
      .where('chapter.levelId = :levelId', { levelId: currentChapter.levelId })
      .andWhere('chapter.orderIndex < :orderIndex', { orderIndex: currentChapter.orderIndex })
      .orderBy('chapter.orderIndex', 'DESC')
      .getOne();

    if (!prevChapter) return null;

    // Get the last lesson of the previous chapter
    return await this.lessonRepository
      .createQueryBuilder('lesson')
      .where('lesson.chapterId = :chapterId', { chapterId: prevChapter.id })
      .orderBy('lesson.orderIndex', 'DESC')
      .getOne();
  }

  /**
   * Update a lesson
   */
  async update(id: number, updateLessonDto: UpdateLessonDto): Promise<LessonResponseDto> {
    const lesson = await this.lessonRepository.findOne({ where: { lesson_id: id } });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    if (updateLessonDto.title !== undefined) {
      lesson.lesson_title = updateLessonDto.title;
    }

    if (updateLessonDto.description !== undefined) {
      lesson.lesson_description = updateLessonDto.description;
    }

    if (updateLessonDto.type !== undefined) {
      lesson.type = updateLessonDto.type;
    }

    if (updateLessonDto.refSource !== undefined) {
      lesson.ref_source = updateLessonDto.refSource;
    }

    if (updateLessonDto.refId !== undefined) {
      lesson.ref_id = updateLessonDto.refId;
    }

    if (updateLessonDto.orderIndex !== undefined) {
      lesson.order_index = updateLessonDto.orderIndex;
    }

    const saved = await this.lessonRepository.save(lesson);
    return this.toResponseDto(saved);
  }

  /**
   * Delete a lesson (cascades to article if exists)
   */
  async remove(id: number): Promise<void> {
    const lesson = await this.lessonRepository.findOne({ where: { lesson_id: id } });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    await this.lessonRepository.remove(lesson);
  }

  /**
   * Reorder lessons within a chapter
   */
  async reorder(chapterId: number, lessonIds: number[]): Promise<LessonResponseDto[]> {
    const lessons = await this.lessonRepository.find({
      where: { chapter_id: chapterId },
    });

    const lessonMap = new Map(lessons.map((l) => [l.lesson_id, l]));

    for (let i = 0; i < lessonIds.length; i++) {
      const lesson = lessonMap.get(lessonIds[i]);
      if (lesson) {
        lesson.order_index = i;
        await this.lessonRepository.save(lesson);
      }
    }

    return this.findByChapter(chapterId);
  }

  /**
   * Map entity to response DTO
   */
  private toResponseDto(lesson: Lesson): LessonResponseDto {
    return {
      id: lesson.lesson_id,
      title: lesson.lesson_title,
      description: lesson.lesson_description,
      type: lesson.type,
      refSource: lesson.ref_source,
      refId: lesson.ref_id,
      orderIndex: lesson.order_index,
      chapterId: lesson.chapter_id,
      createdAt: lesson.createdAt,
    };
  }
}
