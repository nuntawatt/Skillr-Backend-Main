import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException, Get, Param, Patch, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import * as multer from 'multer';

import { ArticlesService } from './articles.service';

const MAX_PDF_SIZE_BYTES = 51 * 1024 * 1024; // 51MB

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
    createArticle(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('PDF file is required');
        }

        return this.articlesService.createWithPdf(file);
    }

    @Get(':id')
    async getArticle(@Param('id') id: number) {
        return this.articlesService.getArticleById(id);        
    }

    @Patch(':id')
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
    async deleteArticle(@Param('id') id: number) {
        if (!id) {
            throw new BadRequestException('Article ID is required');
        }
        return this.articlesService.deleteArticleById(id);       
    }
}
