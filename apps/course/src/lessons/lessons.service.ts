import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Lesson, LessonType } from './entities/lesson.entity';
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

  // Create a new lesson
  async create(createLessonDto: CreateLessonDto): Promise<LessonResponseDto> {
    // Verify chapter exists
    const chapter = await this.chapterRepository.findOne({
      where: { chapter_id: createLessonDto.chapter_id },
    });

    if (!chapter) {
      throw new NotFoundException(`Chapter with ID ${createLessonDto.chapter_id} not found`);
    }

    // Auto-generate orderIndex if not provided
    let orderIndex = createLessonDto.orderIndex;
    if (orderIndex === undefined) {
      const maxOrderResult = await this.lessonRepository
        .createQueryBuilder('lesson')
        .where('lesson.chapter_id = :chapterId', { chapterId: createLessonDto.chapter_id })
        .select('MAX(lesson.order_index)', 'maxOrder')
        .getRawOne();
      orderIndex = (maxOrderResult?.maxOrder ?? -1) + 1;
    }

    const lesson = this.lessonRepository.create({
      lesson_title: createLessonDto.lesson_title,
      lesson_description: createLessonDto.lesson_description,
      chapter_id: createLessonDto.chapter_id,
      lesson_type: createLessonDto.lesson_type,
      ref_id: createLessonDto.ref_id,
      orderIndex: orderIndex,
    });

    const saved = await this.lessonRepository.save(lesson);
    return this.toResponseDto(saved);
  }

  // Create a new article lesson with content in a transaction
  async createArticleLesson(
    createLessonDto: Omit<CreateLessonDto, 'lesson_type' | 'ref_id'>,
    content: any,
  ): Promise<LessonResponseDto> {
    return await this.dataSource.transaction(async (manager) => {
      // Verify chapter exists
      const chapter = await manager.findOne(Chapter, {
        where: { chapter_id: createLessonDto.chapter_id },
      });

      if (!chapter) {
        throw new NotFoundException(`Chapter with ID ${createLessonDto.chapter_id} not found`);
      }

      // Auto-generate orderIndex if not provided
      let orderIndex = createLessonDto.orderIndex;
      if (orderIndex === undefined) {
        const maxOrderResult = await manager
          .createQueryBuilder(Lesson, 'lesson')
          .where('lesson.chapter_id = :chapterId', { chapterId: createLessonDto.chapter_id })
          .select('MAX(lesson.order_index)', 'maxOrder')
          .getRawOne();
        orderIndex = (maxOrderResult?.maxOrder ?? -1) + 1;
      }

      // Create article first to get its ID
      const article = manager.create(Article, {
        content,
        lesson_id: 0, // Will be updated after lesson creation
      });

      // We need to save the lesson first to get its ID
      const lesson = manager.create(Lesson, {
        lesson_title: createLessonDto.lesson_title,
        lesson_description: createLessonDto.lesson_description,
        chapter_id: createLessonDto.chapter_id,
        lesson_type: LessonType.ARTICLE,
        ref_id: 0, // Will be updated
        orderIndex: orderIndex,
      });

      const savedLesson = await manager.save(lesson);

      // Now create the article with the lesson ID
      article.lesson_id = savedLesson.lesson_id;
      const savedArticle = await manager.save(article);

      // Update the lesson with the article's ID
      savedLesson.ref_id = savedArticle.article_id;
      await manager.save(savedLesson);

      return this.toResponseDto(savedLesson);
    });
  }

  // Get all lessons for a chapter
  async findByChapter(chapterId: number): Promise<LessonResponseDto[]> {
    const lessons = await this.lessonRepository.find({
      where: { chapter_id: chapterId },
      order: { orderIndex: 'ASC' },
    });

    return lessons.map((l) => this.toResponseDto(l));
  }

  // Find a lesson by ID
  async findOne(id: number): Promise<LessonResponseDto> {
    const lesson = await this.lessonRepository.findOne({ where: { lesson_id: id } });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    return this.toResponseDto(lesson);
  }

  // Update a lesson
  async update(id: number, updateLessonDto: UpdateLessonDto): Promise<LessonResponseDto> {
    const lesson = await this.lessonRepository.findOne({ where: { lesson_id: id } });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    if (updateLessonDto.lesson_title !== undefined) {
      lesson.lesson_title = updateLessonDto.lesson_title;
    }

    if (updateLessonDto.lesson_description !== undefined) {
      lesson.lesson_description = updateLessonDto.lesson_description;
    }

    if (updateLessonDto.lesson_type !== undefined) {
      lesson.lesson_type = updateLessonDto.lesson_type;
    }

    if (updateLessonDto.ref_id !== undefined) {
      lesson.ref_id = updateLessonDto.ref_id;
    }

    if (updateLessonDto.orderIndex !== undefined) {
      lesson.orderIndex = updateLessonDto.orderIndex;
    }

    const saved = await this.lessonRepository.save(lesson);
    return this.toResponseDto(saved);
  }

  // Delete a lesson
  async remove(id: number): Promise<void> {
    const lesson = await this.lessonRepository.findOne({ where: { lesson_id: id } });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    await this.lessonRepository.remove(lesson);
  }

  // Reorder lessons within a chapter
  async reorder(chapterId: number, lessonIds: number[]): Promise<LessonResponseDto[]> {
    const lessons = await this.lessonRepository.find({
      where: { chapter_id: chapterId },
    });

    const lessonMap = new Map(lessons.map((l) => [l.lesson_id, l]));

    for (let i = 0; i < lessonIds.length; i++) {
      const lesson = lessonMap.get(lessonIds[i]);
      if (lesson) {
        lesson.orderIndex = i;
        await this.lessonRepository.save(lesson);
      }
    }

    return this.findByChapter(chapterId);
  }

  // Convert Lesson entity to LessonResponseDto
  private toResponseDto(lesson: Lesson): LessonResponseDto {
    return {
      lesson_id: lesson.lesson_id,
      lesson_title: lesson.lesson_title,
      lesson_description: lesson.lesson_description,
      lesson_type: lesson.lesson_type,
      ref_id: lesson.ref_id,
      orderIndex: lesson.orderIndex,
      chapter_id: lesson.chapter_id,
      createdAt: lesson.createdAt,
    };
  }
}
