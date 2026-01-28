import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Article } from './entities/article.entity';
import { Lesson, LessonType } from '../lessons/entities/lesson.entity';
import { CreateArticleDto, UpdateArticleDto, ArticleResponseDto, ArticleCardResponseDto, ArticleProgressUpdateDto } from './dto';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    private readonly storageService: StorageService,
<<<<<<< HEAD
  ) { }
=======
    private readonly httpService: HttpService,
  ) {}
>>>>>>> wave-service-quizs-learning

  // Create a new article
  async create(createArticleDto: CreateArticleDto): Promise<ArticleResponseDto> {
    // Verify lesson exists and is of type article
    const lesson = await this.lessonRepository.findOne({
      where: { lesson_id: createArticleDto.lesson_id },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${createArticleDto.lesson_id} not found`);
    }

    if (lesson.lesson_type !== LessonType.ARTICLE) {
      throw new BadRequestException(`Lesson with ID ${createArticleDto.lesson_id} is not of type 'article'`);
    }

    // Allow multiple articles per lesson. Do not block creation if others exist.

    const article = this.articleRepository.create({
<<<<<<< HEAD
      lesson_id: createArticleDto.lesson_id,
=======
      lessonId: createArticleDto.lessonId,
      cards: createArticleDto.cards,
>>>>>>> wave-service-quizs-learning
      article_content: createArticleDto.article_content,
    });

    const saved = await this.articleRepository.save(article);

    // Update lesson's ref_id to point to the article
    lesson.ref_id = saved.article_id;
    await this.lessonRepository.save(lesson);

    return this.toResponseDto(saved);
  }

  // Create article with uploaded PDF
  async createWithPdf(body: { lessonId: number; content?: any }, fileBuffer: Buffer): Promise<ArticleResponseDto> {
    const lesson = await this.lessonRepository.findOne({ where: { lesson_id: body.lessonId } });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${body.lessonId} not found`);
    }

    if (lesson.lesson_type !== LessonType.ARTICLE) {
      throw new BadRequestException(`Lesson with ID ${body.lessonId} is not of type 'article'`);
    }

    // Allow multiple articles per lesson when creating with PDF; do not block creation.

    const pdfKey = `articles/pdf/${randomUUID()}.pdf`;
    await this.storageService.putObject(this.storageService.bucket, pdfKey, fileBuffer, fileBuffer.length, { 'Content-Type': 'application/pdf' });

    const article = this.articleRepository.create({ lesson_id: body.lessonId, article_content: body.content, pdfArticle: Buffer.from(pdfKey, 'utf8') });
    const saved = await this.articleRepository.save(article);

    lesson.ref_id = saved.article_id;
    await this.lessonRepository.save(lesson);

    return this.toResponseDto(saved);
  }

  // Upload or replace PDF for an existing article
  async uploadPdfToArticle(articleId: number, fileBuffer: Buffer): Promise<ArticleResponseDto> {
    const article = await this.articleRepository.findOne({ where: { article_id: articleId } });
    if (!article) throw new NotFoundException(`Article with ID ${articleId} not found`);

    // remove previous object if stored as key
    try {
      const prev = article.pdfArticle ? article.pdfArticle.toString('utf8') : undefined;
      if (prev && prev.startsWith('articles/')) {
        await this.storageService.removeObject(this.storageService.bucket, prev);
      }
    } catch { }

    const pdfKey = `articles/pdf/${randomUUID()}.pdf`;
    await this.storageService.putObject(this.storageService.bucket, pdfKey, fileBuffer, fileBuffer.length, { 'Content-Type': 'application/pdf' });

    article.pdfArticle = Buffer.from(pdfKey, 'utf8');
    const saved = await this.articleRepository.save(article);
    return this.toResponseDto(saved);
  }

  // Get presigned URL for article PDF
  async getPdfUrl(articleId: number): Promise<string> {
    const article = await this.articleRepository.findOne({ where: { article_id: articleId } });
    if (!article) throw new NotFoundException(`Article with ID ${articleId} not found`);

    const key = article.pdfArticle ? article.pdfArticle.toString('utf8') : undefined;
    if (!key) throw new NotFoundException(`No PDF stored for article ${articleId}`);

    const url = await this.storageService.buildPublicUrl(this.storageService.bucket, key);
    if (!url) throw new BadRequestException('Failed to build presigned URL');
    return url;
  }

  // Find all articles with pagination
  async findAll(params?: { limit?: number; offset?: number }): Promise<ArticleResponseDto[]> {
    const limit = params?.limit && params.limit > 0 ? Math.min(params.limit, 100) : 50;
    const offset = params?.offset && params.offset >= 0 ? params.offset : 0;

    const articles = await this.articleRepository.find({
      take: limit,
      skip: offset,
      order: { updatedAt: 'DESC' },
    });

    return Promise.all(articles.map((a) => this.toResponseDto(a)));
  }

  // Find an article by ID
  async findOne(id: number): Promise<ArticleResponseDto> {
    const article = await this.articleRepository.findOne({ 
      where: { article_id: id },
      relations: ['cards'],
      order: {
        cards: {
          sequenceOrder: 'ASC'
        }
      }
    });

    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }

    return this.toResponseDto(article);
  }

  // Find an article by lesson ID
  async findByLessonId(lessonId: number): Promise<ArticleResponseDto> {
<<<<<<< HEAD
    const article = await this.articleRepository.findOne({ where: { lesson_id: lessonId } });
=======
    const article = await this.articleRepository.findOne({ 
      where: { lessonId },
      relations: ['cards'],
      order: {
        cards: {
          sequenceOrder: 'ASC'
        }
      }
    });
>>>>>>> wave-service-quizs-learning

    if (!article) {
      throw new NotFoundException(`Article for lesson with ID ${lessonId} not found`);
    }

    return this.toResponseDto(article);
  }

  // Get only cards for an article
  async getCards(articleId: number): Promise<ArticleCardResponseDto[]> {
    const article = await this.articleRepository.findOne({
      where: { article_id: articleId },
      relations: ['cards'],
      order: {
        cards: {
          sequenceOrder: 'ASC'
        }
      }
    });

    if (!article) {
      throw new NotFoundException(`Article with ID ${articleId} not found`);
    }

    return (article.cards || []).map(card => ({
      id: card.id,
      content: card.content,
      mediaUrl: card.mediaUrl,
      sequenceOrder: card.sequenceOrder,
    }));
  }

  // Get user state for an article from learning service
  async getUserState(articleId: number, userId: string): Promise<any> {
    const article = await this.articleRepository.findOne({ where: { article_id: articleId } });
    if (!article) {
      throw new NotFoundException(`Article with ID ${articleId} not found`);
    }

    const learningServiceUrl = process.env.LEARNING_SERVICE_URL || 'http://localhost:3005';
    
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${learningServiceUrl}/learning/lessons/${article.lessonId}/progress`, {
          headers: { 'x-user-id': userId }
        })
      );
      
      const progress = response.data;
      return {
        currentCardIndex: progress?.lastReadCardIndex ?? 0,
        isCompleted: !!progress?.completedAt
      };
    } catch (error) {
      // Return default state if progress not found
      return {
        currentCardIndex: 0,
        isCompleted: false
      };
    }
  }

  // Save progress for an article
  async saveProgress(articleId: number, userId: string, currentCardIndex: number): Promise<any> {
    const article = await this.articleRepository.findOne({ 
      where: { article_id: articleId },
      relations: ['cards']
    });

    if (!article) {
      throw new NotFoundException(`Article with ID ${articleId} not found`);
    }

    const totalCards = article.cards?.length || 0;
    const isCompleted = currentCardIndex + 1 >= totalCards;

    const learningServiceUrl = process.env.LEARNING_SERVICE_URL || 'http://localhost:3005';
    
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${learningServiceUrl}/learning/lessons/${article.lessonId}/progress`, {
          lastReadCardIndex: currentCardIndex,
          isCompleted: isCompleted
        }, {
          headers: { 'x-user-id': userId }
        })
      );
      
      return {
        ...response.data,
        isCompleted // explicitly return calculated status
      };
    } catch (error) {
      console.error('Error saving progress to learning service:', error.response?.data || error.message);
      throw new BadRequestException('Failed to update progress in learning service');
    }
  }

  // Update an article by ID
  async update(id: number, updateArticleDto: UpdateArticleDto): Promise<ArticleResponseDto> {
    const article = await this.articleRepository.findOne({ where: { article_id: id } });

    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }

    if ((updateArticleDto as any).article_content !== undefined) {
      article.article_content = (updateArticleDto as any).article_content;
    }

    // PDF binary updates are handled via the dedicated upload or base64 endpoints.

    const saved = await this.articleRepository.save(article);
    return this.toResponseDto(saved);
  }

  // Delete an article by ID
  async remove(id: number): Promise<void> {
    const article = await this.articleRepository.findOne({ where: { article_id: id } });

    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }

    await this.articleRepository.remove(article);
  }

  // Convert Article entity to ArticleResponseDto
<<<<<<< HEAD
  private toResponseDto(article: Article): ArticleResponseDto {
    const lessonIdValue = typeof (article as any).lesson_id === 'number'
      ? (article as any).lesson_id
      : (article as any).lesson?.lesson_id ?? null;

    return {
      article_id: article.article_id,
      lesson_id: lessonIdValue,
=======
  async toResponseDto(article: Article): Promise<ArticleResponseDto> {
    return {
      id: article.article_id,
      lessonId: article.lessonId,
      cards: article.cards?.map(card => ({
        id: card.id,
        content: card.content,
        mediaUrl: card.mediaUrl,
        sequenceOrder: card.sequenceOrder,
      })),
>>>>>>> wave-service-quizs-learning
      article_content: article.article_content,
    } as ArticleResponseDto;
  }
}