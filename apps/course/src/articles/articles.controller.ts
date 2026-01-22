import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException, Get, Param, Patch, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiConsumes, ApiTags, ApiBody, ApiResponse } from '@nestjs/swagger';
import * as multer from 'multer';

import { ArticlesService } from './articles.service';

const MAX_PDF_SIZE_BYTES = 51 * 1024 * 1024;

@ApiTags('Articles')
@Controller('articles')
export class ArticlesController {
    constructor(private readonly articlesService: ArticlesService) { }

    // Create article with PDF upload
    @Post()
    @UseInterceptors(
        FileInterceptor('file', {
            storage: multer.memoryStorage(),
            limits: { fileSize: MAX_PDF_SIZE_BYTES },
            fileFilter: (req, file, decide) => {
                if (file.mimetype !== 'application/pdf') {
                    return decide(
                        new BadRequestException('Only PDF files are allowed'),
                        false,
                    );
                }
                decide(null, true);
            },
        }),
    )
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Create a new article with PDF upload' })
    @ApiBody({ description: 'PDF file', type: 'file' })
    @ApiResponse({ status: 201, description: 'Article created successfully.' })
    @ApiResponse({ status: 400, description: 'Bad Request.' })
    @ApiResponse({ status: 500, description: 'Internal Server Error.' })
    async createArticle(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('PDF file is required');
        }

        return this.articlesService.createWithPdf(file);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get article by ID' })
    @ApiResponse({ status: 200, description: 'Article retrieved successfully.' })
    @ApiResponse({ status: 404, description: 'Article not found.' })
    @ApiResponse({ status: 500, description: 'Internal Server Error.' })
    async getArticle(@Param('id') id: number) {
        return this.articlesService.getArticleById(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update article PDF by ID' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({ description: 'PDF file', type: 'file' })
    @ApiResponse({ status: 200, description: 'Article PDF updated successfully.' })
    @ApiResponse({ status: 400, description: 'Bad Request.' })
    @ApiResponse({ status: 404, description: 'Article not found.' })
    @ApiResponse({ status: 500, description: 'Internal Server Error.' })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: multer.memoryStorage(),
            limits: { fileSize: MAX_PDF_SIZE_BYTES },
            fileFilter: (req, file, decide) => {
                if (file.mimetype !== 'application/pdf') {
                    return decide(
                        new BadRequestException('Only PDF files are allowed'),
                        false,
                    );
                }
                decide(null, true);
            },
        }),
    )
    @ApiConsumes('multipart/form-data')
    async updateArticlePdf(@Param('id') id: number, @UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('PDF file is required');
        }
        return this.articlesService.updateArticlePdf(id, file);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete article by ID' })
    @ApiResponse({ status: 200, description: 'Article deleted successfully.' })
    @ApiResponse({ status: 404, description: 'Article not found.' })
    @ApiResponse({ status: 500, description: 'Internal Server Error.' })
    async deleteArticle(@Param('id') id: number) {
        if (!id) {
            throw new BadRequestException('Article ID is required');
        }
        return this.articlesService.deleteArticleById(id);
    }
}
