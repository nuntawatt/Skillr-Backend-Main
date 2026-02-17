import { Body, Controller, Post, Get, Param, Query, BadRequestException, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCreatedResponse, ApiOkResponse, ApiBody, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { ArticleResponseDto } from './dto/article-response.dto';

@ApiTags('Articles')
@Controller('articles')
export class ArticlesController {
    constructor(private readonly svc: ArticlesService) { }

    @Post()
    @ApiOperation({ summary: 'สร้างบทความใหม่' })
    @ApiBody({
        type: CreateArticleDto,
        examples: {
            example1: {
                summary: 'Create article example',
                value: {
                    lesson_id: 1,
                    article_content: [
                        {
                            imageUrl: 'https://cdn.yoursite.com/images/abc.jpg',
                            article: 'Another article block',
                            order: 1,
                        },
                        {
                            imageUrl: 'https://cdn.yoursite.com/images/xyz.jpg',
                            article: 'Another article block',
                            order: 2,
                        },
                    ],
                },
            },
        },  
    })
    @ApiCreatedResponse({ type: ArticleResponseDto, description: 'Article created successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    async create(@Body() body: CreateArticleDto) {
        if (!body?.lesson_id) throw new BadRequestException('lesson_id is required');
        return this.svc.create(body);
    }

    @Get()
    @ApiOperation({ summary: 'ดึงบทความทั้งหมดพร้อมตัวกรองที่เลือกได้' })
    @ApiOkResponse({ type: ArticleResponseDto, isArray: true })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    findAll(): Promise<ArticleResponseDto[]> {
        return this.svc.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'ดึงบทความตาม ID' })
    @ApiParam({ name: 'id', description: 'Article id', type: 'number' })
    @ApiResponse({ status: 200, description: 'Article retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Article not found' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    @ApiOkResponse({ type: ArticleResponseDto })
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return this.svc.findOne(id);
    }

    @Get('lesson/:id')
    @ApiOperation({ summary: 'ดึงบทความตาม lesson ID' })
    @ApiParam({ name: 'id', description: 'Lesson id', type: 'number' })
    @ApiResponse({ status: 200, description: 'Articles retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Articles not found' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    @ApiOkResponse({ type: ArticleResponseDto, isArray: true })
    async findByLesson(@Param('id', ParseIntPipe) lessonId: number) {
        return this.svc.findByLesson(lessonId);
    }
}