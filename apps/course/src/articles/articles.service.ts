import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Article } from './entities/article.entity';
import { Lesson, LessonType } from '../lessons/entities/lesson.entity';
import { CreateArticleDto, UpdateArticleDto, ArticleResponseDto } from './dto';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    private readonly storageService: StorageService,
  ) {}

  // Create a new article
  async create(createArticleDto: CreateArticleDto): Promise<ArticleResponseDto> {
    // Verify lesson exists and is of type article
    const lesson = await this.lessonRepository.findOne({
      where: { lesson_id: createArticleDto.lessonId },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${createArticleDto.lessonId} not found`);
    }

    if (lesson.type !== LessonType.ARTICLE) {
      throw new BadRequestException(`Lesson with ID ${createArticleDto.lessonId} is not of type 'article'`);
    }

    // Check if article already exists for this lesson
    const existingArticle = await this.articleRepository.findOne({
      where: { lessonId: createArticleDto.lessonId },
    });

    if (existingArticle) {
      throw new BadRequestException(`Article already exists for lesson with ID ${createArticleDto.lessonId}`);
    }

    const article = this.articleRepository.create({
      lessonId: createArticleDto.lessonId,
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

    if (lesson.type !== LessonType.ARTICLE) {
      throw new BadRequestException(`Lesson with ID ${body.lessonId} is not of type 'article'`);
    }

    const existing = await this.articleRepository.findOne({ where: { lessonId: body.lessonId } });
    if (existing) throw new BadRequestException(`Article already exists for lesson ${body.lessonId}`);

    const pdfKey = `articles/pdf/${randomUUID()}.pdf`;
    await this.storageService.putObject(this.storageService.bucket, pdfKey, fileBuffer, fileBuffer.length, { 'Content-Type': 'application/pdf' });

    const article = this.articleRepository.create({ lessonId: body.lessonId, article_content: body.content ?? null, pdfArticle: Buffer.from(pdfKey, 'utf8') });
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
    } catch {}

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

    return articles.map((a) => this.toResponseDto(a));
  }

  // Find an article by ID
  async findOne(id: number): Promise<ArticleResponseDto> {
    const article = await this.articleRepository.findOne({ where: { article_id: id } });

    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }

    return this.toResponseDto(article);
  }

  // Find an article by lesson ID
  async findByLessonId(lessonId: number): Promise<ArticleResponseDto> {
    const article = await this.articleRepository.findOne({ where: { lessonId } });

    if (!article) {
      throw new NotFoundException(`Article for lesson with ID ${lessonId} not found`);
    }

    return this.toResponseDto(article);
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
  private toResponseDto(article: Article): ArticleResponseDto {
    return {
      id: article.article_id,
      lessonId: article.lessonId,
      article_content: article.article_content,
      hasPdfArticle: !!article.pdfArticle,
      updatedAt: article.updatedAt,
    };
  }
}