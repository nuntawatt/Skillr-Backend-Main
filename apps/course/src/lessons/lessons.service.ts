import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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
  ) {}

  /**
   * Create a new lesson for a chapter
   * For article type, also creates the Article entity in a transaction
   */
  async create(createLessonDto: CreateLessonDto): Promise<LessonResponseDto> {
    // Verify chapter exists
    const chapter = await this.chapterRepository.findOne({
      where: { id: createLessonDto.chapterId },
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
        .where('lesson.chapterId = :chapterId', { chapterId: createLessonDto.chapterId })
        .select('MAX(lesson.orderIndex)', 'maxOrder')
        .getRawOne();
      orderIndex = (maxOrderResult?.maxOrder ?? -1) + 1;
    }

    const lesson = this.lessonRepository.create({
      title: createLessonDto.title,
      description: createLessonDto.description,
      chapterId: createLessonDto.chapterId,
      type: createLessonDto.type,
      refSource: createLessonDto.refSource,
      refId: createLessonDto.refId,
      orderIndex,
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
        where: { id: createLessonDto.chapterId },
      });

      if (!chapter) {
        throw new NotFoundException(`Chapter with ID ${createLessonDto.chapterId} not found`);
      }

      // Auto-generate orderIndex if not provided
      let orderIndex = createLessonDto.orderIndex;
      if (orderIndex === undefined) {
        const maxOrderResult = await manager
          .createQueryBuilder(Lesson, 'lesson')
          .where('lesson.chapterId = :chapterId', { chapterId: createLessonDto.chapterId })
          .select('MAX(lesson.orderIndex)', 'maxOrder')
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
        title: createLessonDto.title,
        description: createLessonDto.description,
        chapterId: createLessonDto.chapterId,
        type: LessonType.ARTICLE,
        refSource: LessonRefSource.COURSE,
        refId: 0, // Will be updated
        orderIndex,
      });

      const savedLesson = await manager.save(lesson);

      // Now create the article with the lesson ID
      article.lessonId = savedLesson.id;
      const savedArticle = await manager.save(article);

      // Update the lesson with the article's ID
      savedLesson.refId = savedArticle.id;
      await manager.save(savedLesson);

      return this.toResponseDto(savedLesson);
    });
  }

  /**
   * Find all lessons for a chapter
   */
  async findByChapter(chapterId: number): Promise<LessonResponseDto[]> {
    const lessons = await this.lessonRepository.find({
      where: { chapterId },
      order: { orderIndex: 'ASC' },
    });

    return lessons.map((l) => this.toResponseDto(l));
  }

  /**
   * Find a single lesson by ID
   */
  async findOne(id: number): Promise<LessonResponseDto> {
    const lesson = await this.lessonRepository.findOne({ where: { id } });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    return this.toResponseDto(lesson);
  }

  /**
   * Update a lesson
   */
  async update(id: number, updateLessonDto: UpdateLessonDto): Promise<LessonResponseDto> {
    const lesson = await this.lessonRepository.findOne({ where: { id } });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    if (updateLessonDto.title !== undefined) {
      lesson.title = updateLessonDto.title;
    }

    if (updateLessonDto.description !== undefined) {
      lesson.description = updateLessonDto.description;
    }

    if (updateLessonDto.type !== undefined) {
      lesson.type = updateLessonDto.type;
    }

    if (updateLessonDto.refSource !== undefined) {
      lesson.refSource = updateLessonDto.refSource;
    }

    if (updateLessonDto.refId !== undefined) {
      lesson.refId = updateLessonDto.refId;
    }

    if (updateLessonDto.orderIndex !== undefined) {
      lesson.orderIndex = updateLessonDto.orderIndex;
    }

    const saved = await this.lessonRepository.save(lesson);
    return this.toResponseDto(saved);
  }

  /**
   * Delete a lesson (cascades to article if exists)
   */
  async remove(id: number): Promise<void> {
    const lesson = await this.lessonRepository.findOne({ where: { id } });

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
      where: { chapterId },
    });

    const lessonMap = new Map(lessons.map((l) => [l.id, l]));

    for (let i = 0; i < lessonIds.length; i++) {
      const lesson = lessonMap.get(lessonIds[i]);
      if (lesson) {
        lesson.orderIndex = i;
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
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      type: lesson.type,
      refSource: lesson.refSource,
      refId: lesson.refId,
      orderIndex: lesson.orderIndex,
      chapterId: lesson.chapterId,
      createdAt: lesson.createdAt,
    };
  }
}
