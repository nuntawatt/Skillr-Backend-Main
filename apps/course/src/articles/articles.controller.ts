import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, HttpCode, HttpStatus, UseInterceptors, UploadedFile, UploadedFiles, BadRequestException, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiParam, ApiQuery, ApiNoContentResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { CreateArticleDto, UpdateArticleDto, ArticleResponseDto } from './dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';

const MAX_PDF_SIZE_BYTES = 51 * 1024 * 1024;

@ApiTags('Articles')
@Controller('articles')
export class ArticlesController {
    constructor(private readonly articlesService: ArticlesService) { }

    @Post()
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
        try {
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
            return this.articlesService.create(dto);
        } catch (err: any) {
            // rethrow http exceptions unchanged
            if (err instanceof HttpException) throw err;
            // log full error for debugging
            console.error('POST /articles error:', err?.stack || err?.message || err);
            throw new HttpException(err?.message || 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
        }
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
    @ApiOperation({ summary: 'Create article with uploaded PDF (multipart/form-data)' })
    @ApiCreatedResponse({ type: ArticleResponseDto })
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
    @ApiOperation({ summary: 'Upload or replace PDF for an existing article (multipart/form-data)' })
    @ApiOkResponse({ type: ArticleResponseDto })
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
