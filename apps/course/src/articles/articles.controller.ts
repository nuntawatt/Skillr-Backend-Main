import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, HttpCode, HttpStatus, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiParam, ApiQuery, ApiNoContentResponse } from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { CreateArticleDto, UpdateArticleDto, ArticleResponseDto } from './dto';
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
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateArticleDto: UpdateArticleDto,
    ): Promise<ArticleResponseDto> {
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
