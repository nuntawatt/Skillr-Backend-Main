import { Body, Controller, Post, Get, Param, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCreatedResponse, ApiOkResponse, ApiBody, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { ArticleResponseDto } from './dto/article-response.dto';

@ApiTags('Articles')
@Controller('articles')
export class ArticlesController {
    constructor(private readonly svc: ArticlesService) { }

    @Post()
    @ApiOperation({ summary: 'Create an article (JSON body) - image_id should come from media-service' })
    @ApiBody({
        type: CreateArticleDto,
        examples: {
            example1: {
                summary: 'Example payload to create an article',
                value: {
                    lesson_id: 1,
                    article_content: [
                        { id: 123, article: 'This is a sample article block', order: 1 },
                        { id: 124, article: 'Another article block', order: 2 },
                    ],
                },
            },
        },
    })
    @ApiCreatedResponse({ type: ArticleResponseDto, description: 'Article created successfully'})
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    async create(@Body() body: CreateArticleDto) {
        if (!body?.lesson_id) throw new BadRequestException('lesson_id is required');
        return this.svc.create(body);
    }

    @Get()
    @ApiOperation({ summary: 'Get all articles with optional filters' })
      @ApiOkResponse({ type: ArticleResponseDto, isArray: true })
      @ApiResponse({ status: 500, description: 'Internal server error' })
      findAll(): Promise<ArticleResponseDto[]> {
        return this.svc.findAll();
      }

    @Get(':id')
    @ApiOperation({ summary: 'Get article by id' })
    @ApiParam({ name: 'id', description: 'Article id', type: 'number' })
    @ApiResponse({ status: 200, description: 'Article retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Article not found' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    @ApiOkResponse({ type: ArticleResponseDto })
    async findOne(@Param('id') id: string) {
        return this.svc.findOne(Number(id));
    }

}
