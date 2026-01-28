<<<<<<< HEAD
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, HttpCode, HttpStatus, UseInterceptors, UploadedFile, UploadedFiles, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiParam, ApiQuery, ApiNoContentResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { CreateArticleDto, UpdateArticleDto, ArticleResponseDto } from './dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
=======
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Request, ParseIntPipe, HttpCode, HttpStatus, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiParam, ApiQuery, ApiNoContentResponse, ApiResponse } from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { CreateArticleDto, UpdateArticleDto, ArticleResponseDto, ArticleCardResponseDto, ArticleProgressUpdateDto } from './dto';
import { FileInterceptor } from '@nestjs/platform-express';
>>>>>>> wave-service-quizs-learning
import * as multer from 'multer';

const MAX_PDF_SIZE_BYTES = 51 * 1024 * 1024;

@ApiTags('Articles')
@Controller('articles')
export class ArticlesController {
    constructor(private readonly articlesService: ArticlesService) { }

    @Post()
<<<<<<< HEAD
    @ApiOperation({ summary: 'Create a new article for a lesson (multipart: upload images + article JSON)' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                lesson_id: { type: 'integer', format: 'int32', description: 'Lesson ID (form field)' },
                article: { type: 'string', description: 'Optional JSON string matching CreateArticleDto.article_content' },
                images: { type: 'array', items: { type: 'string', format: 'binary' } },
            },
        },
    })
    @ApiCreatedResponse({ type: ArticleResponseDto, description: 'Article created successfully' })
    @UseInterceptors(
        FilesInterceptor('images', 20, {
            storage: multer.memoryStorage(),
            limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per image
            fileFilter: (req, file, cb) => {
                if (!file.mimetype.startsWith('image/')) {
                    return cb(new BadRequestException('Only image files are allowed'), false);
                }
                cb(null, true);
            },
        }),
    )
    async create(@Body() body: any, @UploadedFiles() files: Express.Multer.File[]): Promise<ArticleResponseDto> {
        // Expect either: multipart form with fields `lesson_id` and optional `article` JSON string, plus `images` files
        const lessonIdRaw = body?.lesson_id ?? (body?.lesson ? (typeof body.article === 'string' ? (() => { try { return JSON.parse(body.article).lesson_id } catch { return undefined } })() : body.article?.lesson_id) : undefined);

        const lesson_id = Number(lessonIdRaw);
        if (!Number.isFinite(lesson_id) || lesson_id <= 0) {
            throw new BadRequestException('lesson_id is required and must be a positive number');
        }

        // Parse article JSON if provided. If not valid JSON, treat it as plain text description.
        let parsedArticle: any = {};
        if (body?.article) {
            if (typeof body.article === 'string') {
                try {
                    parsedArticle = JSON.parse(body.article);
                } catch {
                    // treat as plain text -> create a single content item with the text
                    parsedArticle = { article_content: [{ url: '', article: body.article }] };
                }
            } else {
                parsedArticle = body.article;
            }
        }

        // Ensure article_content is an array if present
        let article_content = Array.isArray(parsedArticle.article_content) ? parsedArticle.article_content : undefined;

        // Upload files and generate presigned URLs
        const uploadedFiles = files || [];
        let fileIdx = 0;

        if (article_content && article_content.length > 0) {
            for (let i = 0; i < article_content.length; i++) {
                const item = article_content[i];
                if (!item || !item.url) {
                    const f = uploadedFiles[fileIdx++];
                    if (!f) throw new BadRequestException('Not enough uploaded files for article_content placeholders');

                    const extMatch = (f.originalname || '').match(/\.[^.]+$/);
                    const ext = extMatch ? extMatch[0] : '';
                    const key = `articles/images/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
                    await this.articlesService['storageService'].putObject(this.articlesService['storageService'].bucket, key, f.buffer, f.size, { 'Content-Type': f.mimetype });
                    const url = await this.articlesService['storageService'].buildPublicUrl(this.articlesService['storageService'].bucket, key);
                    article_content[i] = { ...(item || {}), url };
                }
            }
        }

        // Append any remaining uploaded files
        while (fileIdx < uploadedFiles.length) {
            const f = uploadedFiles[fileIdx++];
            const extMatch = (f.originalname || '').match(/\.[^.]+$/);
            const ext = extMatch ? extMatch[0] : '';
            const key = `articles/images/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
            await this.articlesService['storageService'].putObject(this.articlesService['storageService'].bucket, key, f.buffer, f.size, { 'Content-Type': f.mimetype });
            const url = await this.articlesService['storageService'].buildPublicUrl(this.articlesService['storageService'].bucket, key);
            article_content = article_content || [];
            article_content.push({ url, article: '' });
        }

        const dto: CreateArticleDto = { lesson_id, article_content } as any;
=======
    @ApiOperation({ 
        summary: 'Create a new article for a lesson',
        description: 'Creates an article and its associated cards. The lessonId must refer to an existing lesson of type ARTICLE.' 
    })
    @ApiCreatedResponse({ 
        type: ArticleResponseDto, 
        description: 'Article and cards created successfully.' 
    })
    @ApiResponse({ 
        status: 400, 
        description: 'Invalid input data or Article already exists for this lesson.',
        schema: {
            example: {
                statusCode: 400,
                message: 'Article already exists for lesson with ID 1',
                error: 'Bad Request'
            }
        }
    })
    @ApiResponse({ 
        status: 404, 
        description: 'Lesson not found.',
        schema: {
            example: {
                statusCode: 404,
                message: 'Lesson with ID 999 not found',
                error: 'Not Found'
            }
        }
    })
    create(@Body() dto: CreateArticleDto): Promise<ArticleResponseDto> {
>>>>>>> wave-service-quizs-learning
        return this.articlesService.create(dto);
    }

    @Post('upload')
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                lessonId: { type: 'integer', format: 'int32', description: 'Lesson ID (form field)' },
                content: { type: 'string', description: 'Optional JSON string of content' },
                file: { type: 'string', format: 'binary' },
            },
        },
    })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: multer.memoryStorage(),
            limits: { fileSize: MAX_PDF_SIZE_BYTES },
            fileFilter: (req, file, cb) => {
                if (file.mimetype !== 'application/pdf') {
                    return cb(new BadRequestException('Only PDF files are allowed'), false);
                }
                cb(null, true);
            },
        }),
    )
    @ApiOperation({ 
        summary: 'Create article with uploaded PDF (multipart/form-data)',
        description: 'Creates an article from a PDF file. Fields: file (binary), lessonId (number), content (JSON string).' 
    })
    @ApiCreatedResponse({ type: ArticleResponseDto })
    @ApiResponse({ 
        status: 400, 
        description: 'Unexpected field name (use "file") or invalid JSON content.',
        schema: {
            example: {
                statusCode: 400,
                message: 'Unexpected field - pdf',
                error: 'Bad Request'
            }
        }
    })
    async createWithPdf(@Body() body: any, @UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('PDF file is required');

        const lessonId = Number(body.lessonId);
        if (!Number.isFinite(lessonId) || lessonId <= 0) throw new BadRequestException('lessonId is required');

        let content: any = undefined;
        if (body.content) {
            try {
                content = typeof body.content === 'string' ? JSON.parse(body.content) : body.content;
            } catch {
                throw new BadRequestException('content must be valid JSON');
            }
        }

        return this.articlesService.createWithPdf({ lessonId, content }, file.buffer);
    }



    @Post(':id/pdf')
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: multer.memoryStorage(),
            limits: { fileSize: MAX_PDF_SIZE_BYTES },
            fileFilter: (req, file, cb) => {
                if (file.mimetype !== 'application/pdf') {
                    return cb(new BadRequestException('Only PDF files are allowed'), false);
                }
                cb(null, true);
            },
        }),
    )
    @ApiOperation({ 
        summary: 'Upload or replace PDF for an existing article (multipart/form-data)',
        description: 'Updates an existing article with a new PDF file. Field: file (binary).'
    })
    @ApiOkResponse({ type: ArticleResponseDto })
    @ApiResponse({ 
        status: 400, 
        description: 'Wrong field name or invalid file type.',
        schema: {
            example: {
                statusCode: 400,
                message: 'Unexpected field - flie',
                error: 'Bad Request'
            }
        }
    })
    @ApiResponse({ status: 404, description: 'Article not found.' })
    async uploadPdf(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('PDF file is required');
        return this.articlesService.uploadPdfToArticle(id, file.buffer);
    }

    @Get()
    @ApiOperation({ summary: 'Get all articles with pagination' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'offset', required: false, type: Number })
    @ApiOkResponse({ type: ArticleResponseDto, isArray: true })
    findAll(@Query('limit') limit?: string, @Query('offset') offset?: string): Promise<ArticleResponseDto[]> {
        return this.articlesService.findAll({
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get an article by ID' })
    @ApiParam({ name: 'id', type: Number })
    @ApiOkResponse({ type: ArticleResponseDto })
    findOne(@Param('id', ParseIntPipe) id: number): Promise<ArticleResponseDto> {
        return this.articlesService.findOne(id);
    }

    @Get(':id/cards')
    @ApiOperation({ 
        summary: 'Get all cards for an article ordered by sequence_order',
        description: 'Returns a list of cards for the specified article ID, sorted by their sequence order.' 
    })
    @ApiParam({ name: 'id', type: Number, description: 'Article ID' })
    @ApiOkResponse({ 
        type: [ArticleCardResponseDto],
        description: 'Returns an array of cards for the article' 
    })
    @ApiResponse({ 
        status: 404, 
        description: 'Article not found.',
        schema: {
            example: {
                statusCode: 404,
                message: 'Article with ID 999 not found',
                error: 'Not Found'
            }
        }
    })
    getCards(@Param('id', ParseIntPipe) id: number): Promise<ArticleCardResponseDto[]> {
        return this.articlesService.getCards(id);
    }

    @Get(':id/user-state')
    @ApiOperation({ 
        summary: 'Get user progress state for an article',
        description: 'Retrieves the last card index read by the user and their completion status. Requires x-user-id header or authenticated user.' 
    })
    @ApiParam({ name: 'id', type: Number, description: 'Article ID' })
    @ApiOkResponse({ 
        description: 'Returns the last read card index and completion status',
        schema: { 
            type: 'object', 
            properties: { 
                currentCardIndex: { type: 'number', example: 5, description: 'The index of the card last read by the user' }, 
                isCompleted: { type: 'boolean', example: false, description: 'Whether the user has finished reading all cards' } 
            },
            example: {
                currentCardIndex: 2,
                isCompleted: false
            }
        } 
    })
    @ApiResponse({ status: 404, description: 'Article not found' })
    getUserState(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
        const userId = req.user?.id || req.headers['x-user-id'] || '1';
        return this.articlesService.getUserState(id, userId);
    }

    @Post(':id/progress')
    @ApiOperation({ 
        summary: 'Save progress (current card) for an article and auto-complete if last card',
        description: 'Updates the user\'s current position in the article. If the index provided is the last card, the lesson is marked as completed.' 
    })
    @ApiParam({ name: 'id', type: Number, description: 'Article ID' })
    @ApiOkResponse({ 
        description: 'Progress saved successfully. Returns the progress record from the learning service.',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'number', example: 1 },
                userId: { type: 'number', example: 1 },
                lessonId: { type: 'number', example: 10 },
                lastReadCardIndex: { type: 'number', example: 2 },
                completedAt: { type: 'string', format: 'date-time', example: '2026-01-27T10:00:00Z', nullable: true },
                isCompleted: { type: 'boolean', example: true }
            },
            example: {
                id: 123,
                userId: 1,
                lessonId: 45,
                lastReadCardIndex: 2,
                completedAt: "2026-01-27T10:00:00Z",
                isCompleted: true
            }
        }
    })
    @ApiResponse({ 
        status: 400, 
        description: 'Failed to update progress (e.g. learning service unavailable).',
        schema: {
            example: {
                statusCode: 400,
                message: 'Failed to update progress in learning service',
                error: 'Bad Request'
            }
        }
    })
    @ApiResponse({ status: 404, description: 'Article not found' })
    saveProgress(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: ArticleProgressUpdateDto,
        @Request() req: any
    ) {
        const userId = req.user?.id || req.headers['x-user-id'] || '1';
        return this.articlesService.saveProgress(id, userId, dto.current_card_index);
    }

    @Get(':id/pdf-url')
    @ApiOperation({ summary: 'Get presigned URL for article PDF' })
    @ApiParam({ name: 'id', type: Number })
    async getPdfUrl(@Param('id', ParseIntPipe) id: number) {
        const url = await this.articlesService.getPdfUrl(id);
        return { url };
    }

    @Get('lesson/:lessonId')
    @ApiOperation({ summary: 'Get an article by lesson ID' })
    @ApiParam({ name: 'lessonId', type: Number })
    @ApiOkResponse({ type: ArticleResponseDto })
    findByLessonId(@Param('lessonId', ParseIntPipe) lessonId: number): Promise<ArticleResponseDto> {
        return this.articlesService.findByLessonId(lessonId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update an article by ID' })
    @ApiParam({ name: 'id', type: Number })
    @ApiOkResponse({ type: ArticleResponseDto })
    update(@Param('id', ParseIntPipe) id: number, @Body() updateArticleDto: UpdateArticleDto): Promise<ArticleResponseDto> {
        return this.articlesService.update(id, updateArticleDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete an article by ID' })
    @ApiParam({ name: 'id', type: Number })
    @ApiNoContentResponse({ description: 'Article deleted successfully' })
    remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
        return this.articlesService.remove(id);
    }
}
