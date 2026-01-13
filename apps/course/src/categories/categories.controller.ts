import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import {
  CategoryResponseDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto';

@ApiTags('Categories Module')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiCreatedResponse({ type: CategoryResponseDto })
  create(@Body() dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    return this.categoriesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List categories' })
  @ApiQuery({
    name: 'is_active',
    required: false,
    type: String,
    description: 'Filter by active status (true/false)',
  })
  @ApiOkResponse({ type: CategoryResponseDto, isArray: true })
  findAll(
    @Query('is_active') isActive?: string,
  ): Promise<CategoryResponseDto[]> {
    return this.categoriesService.findAll(isActive);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by id' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: CategoryResponseDto })
  findOne(@Param('id') id: string): Promise<CategoryResponseDto> {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update category by id' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: CategoryResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete category by id' })
  @ApiParam({ name: 'id', type: Number })
  remove(@Param('id') id: string): Promise<void> {
    return this.categoriesService.remove(id);
  }
}

