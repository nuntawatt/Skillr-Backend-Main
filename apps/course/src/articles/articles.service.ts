import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { Article } from './entities/article.entity';
import { StorageService } from '../storage/storage.service';
// import { CreateArticleDto } from './dto/create-article.dto';

@Injectable()
export class ArticlesService {
    constructor(@InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
        private readonly storageService: StorageService,
    ) { }

    async createWithPdf(file: Express.Multer.File,): Promise<Article> {
        if (!file) {
            throw new BadRequestException('PDF file is required');
        }

        const pdfKey = `articles/pdf/${randomUUID()}.pdf`;

        await this.storageService.putObject(
            this.storageService.bucket,
            pdfKey,
            file.buffer,
            file.size,
            { 'Content-Type': 'application/pdf' },
        );

        const article = this.articleRepository.create({ pdfKey, });

        return this.articleRepository.save(article);
    }

    async getArticleById(id: number) {
        const article = await this.articleRepository.findOne({
            where: { id },
        });

        if (!article) {
            throw new BadRequestException('Article not found');
        }

        const butket = this.storageService.bucket;
        const publicUrl = await this.storageService.buildPublicUrl(butket, article.pdfKey);

        return {publicUrl: publicUrl};
    }

    async updateArticlePdf(id: number, file: Express.Multer.File){
        const article = await this.articleRepository.findOne({
            where: { id },
        });

        if (!article) {
            throw new BadRequestException(`Article with id ${id} not found`);
        }

        await this.storageService.removeObject(
            this.storageService.bucket,
            article.pdfKey,
        );

        const pdfKey = `articles/pdf/${randomUUID()}.pdf`;

        await this.storageService.putObject(
            this.storageService.bucket,
            pdfKey,
            file.buffer,
            file.size,
            { 'Content-Type': 'application/pdf' },
        );

        article.pdfKey = pdfKey;
        await this.articleRepository.save(article);

        return {
            id: article.id,
            pdfKey: article.pdfKey,
        }
    }

    async deleteArticleById(id: number) {
        const article = await this.articleRepository.findOne({
            where: { id },
        });
        if (!article) {
            throw new BadRequestException(`Article with id ${id} not found`);
        }
        await this.storageService.removeObject(
            this.storageService.bucket,
            article.pdfKey,
        );
        await this.articleRepository.delete(id);
        return { message: `Article with id ${id} deleted successfully` };
    }
}