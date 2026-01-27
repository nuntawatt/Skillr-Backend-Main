import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Request, ParseIntPipe, HttpCode, HttpStatus, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiParam, ApiQuery, ApiNoContentResponse, ApiResponse } from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { CreateArticleDto, UpdateArticleDto, ArticleResponseDto, ArticleCardResponseDto, ArticleProgressUpdateDto } from './dto';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';

const MAX_PDF_SIZE_BYTES = 51 * 1024 * 1024;

@ApiTags('Articles')
@Controller('articles')
export class ArticlesController {
    constructor(private readonly articlesService: ArticlesService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new article for a lesson' })
    @ApiCreatedResponse({ type: ArticleResponseDto, description: 'Article created successfully' })
    create(@Body() dto: CreateArticleDto): Promise<ArticleResponseDto> {
        return this.articlesService.create(dto);
    }

    @Post('upload')
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

    @Get(':id/cards')
    @ApiOperation({ summary: 'Get all cards for an article ordered by sequence_order' })
    @ApiParam({ name: 'id', type: Number, description: 'Article ID' })
    @ApiOkResponse({ 
        type: [ArticleCardResponseDto],
        description: 'Returns an array of cards for the article' 
    })
    @ApiResponse({ status: 404, description: 'Article not found' })
    getCards(@Param('id', ParseIntPipe) id: number): Promise<ArticleCardResponseDto[]> {
        return this.articlesService.getCards(id);
    }

    @Get(':id/user-state')
    @ApiOperation({ summary: 'Get user progress state for an article' })
    @ApiParam({ name: 'id', type: Number, description: 'Article ID' })
    @ApiOkResponse({ 
        description: 'Returns the last read card index and completion status',
        schema: { 
            type: 'object', 
            properties: { 
                currentCardIndex: { type: 'number', example: 5, description: 'The index of the card last read by the user' }, 
                isCompleted: { type: 'boolean', example: false, description: 'Whether the user has finished reading all cards' } 
            } 
        } 
    })
    @ApiResponse({ status: 404, description: 'Article not found' })
    getUserState(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
        const userId = req.user?.id || req.headers['x-user-id'] || '1';
        return this.articlesService.getUserState(id, userId);
    }

    @Post(':id/progress')
    @ApiOperation({ summary: 'Save progress (current card) for an article and auto-complete if last card' })
    @ApiParam({ name: 'id', type: Number, description: 'Article ID' })
    @ApiOkResponse({ 
        description: 'Progress saved successfully',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'number', example: 1 },
                userId: { type: 'number', example: 1 },
                lessonId: { type: 'number', example: 10 },
                lastReadCardIndex: { type: 'number', example: 2 },
                completedAt: { type: 'string', format: 'date-time', example: '2026-01-27T10:00:00Z', nullable: true },
                isCompleted: { type: 'boolean', example: true }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Invalid input or failure to update progress' })
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
