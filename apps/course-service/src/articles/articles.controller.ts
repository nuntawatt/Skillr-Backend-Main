import { Body, Controller, Post, Get, Param, Query, Patch, Delete, BadRequestException, ParseIntPipe, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCreatedResponse, ApiOkResponse, ApiBody, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { ArticleResponseDto } from './dto/article-response.dto';
import { UpdateArticleDto } from './dto';
import { JwtAuthGuard, RolesGuard, Roles } from '@auth';
import { UserRole } from '@common/enums/user-role.enum';

@ApiTags('Articles')
// @ApiTags('Admin | Articles')
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles(UserRole.ADMIN)
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
    @ApiResponse({ status: 404, description: 'Lesson not found' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    async create(@Body() body: CreateArticleDto) {
        if (!body?.lesson_id) throw new BadRequestException('lesson_id is required');
        return this.svc.create(body);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'แก้ไขบทความตาม ID' })
    @ApiParam({ name: 'id', description: 'Article id', type: 'number' })
    @ApiBody({ type: UpdateArticleDto })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 404, description: 'Article not found' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateArticleDto,) {
        if (!id) throw new BadRequestException('Invalid article id');

        return this.svc.update(id, body);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'ลบบทความตาม ID' })
    @ApiParam({ name: 'id', description: 'Article id', type: 'number' })
    @ApiOkResponse({ description: 'Article deleted successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 404, description: 'Article not found' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    async remove(@Param('id', ParseIntPipe) id: number,) {
        await this.svc.remove(id);

        return {
            message: 'Article deleted successfully',
        };
    }

    // @ApiTags('Student | Articles')
    // @UseGuards(JwtAuthGuard)
    @Get()
    @ApiOperation({ summary: 'ดึงบทความทั้งหมดพร้อมตัวกรองที่เลือกได้' })
    @ApiResponse({ status: 200, description: 'Articles retrieved successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    findAll(): Promise<ArticleResponseDto[]> {
        return this.svc.findAll();
    }

    // @ApiTags('Student | Articles')
    // @UseGuards(JwtAuthGuard)
    @Get(':id')
    @ApiOperation({ summary: 'ดึงบทความตาม ID' })
    @ApiParam({ name: 'id', description: 'Article id', type: 'number' })
    @ApiResponse({ status: 200, description: 'Article retrieved successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 404, description: 'Article not found' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    @ApiOkResponse({ type: ArticleResponseDto })
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return this.svc.findOne(id);
    }

    // @ApiTags('Student | Articles')
    // @UseGuards(JwtAuthGuard)
    @Get('lesson/:id')
    @ApiOperation({ summary: 'ดึงบทความตาม lesson ID' })
    @ApiParam({ name: 'id', description: 'Lesson id', type: 'number' })
    @ApiResponse({ status: 200, description: 'Articles retrieved successfully' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 404, description: 'Lesson not found' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    @ApiOkResponse({ type: ArticleResponseDto, isArray: true })
    async findByLesson(@Param('id', ParseIntPipe) lessonId: number) {
        return this.svc.findByLesson(lessonId);
    }
}