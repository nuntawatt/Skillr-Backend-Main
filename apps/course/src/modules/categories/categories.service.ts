import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<Category> {
    const name = dto.name.trim();
    const slug = this.slugify(dto.slug ?? dto.name);

    await this.assertSlugAvailable(slug);

    const category = this.categoryRepository.create({
      name,
      slug,
      description: dto.description?.trim() ?? undefined,
      isActive: dto.isActive ?? true,
    });

    return this.categoryRepository.save(category);
  }

  async findAll(isActive?: string): Promise<Category[]> {
    const normalized =
      typeof isActive === 'string' ? isActive.trim().toLowerCase() : undefined;

    if (normalized === 'true' || normalized === '1') {
      return this.categoryRepository.find({
        where: { isActive: true },
        order: { name: 'ASC' },
      });
    }

    if (normalized === 'false' || normalized === '0') {
      return this.categoryRepository.find({
        where: { isActive: false },
        order: { name: 'ASC' },
      });
    }

    return this.categoryRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Category> {
    const categoryId = Number(id);
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);

    if (dto.name !== undefined) {
      category.name = dto.name.trim();
    }

    if (dto.slug !== undefined) {
      const newSlug = this.slugify(dto.slug);
      if (newSlug !== category.slug) {
        await this.assertSlugAvailable(newSlug, category.id);
        category.slug = newSlug;
      }
    }

    if (dto.description !== undefined) {
      category.description = dto.description?.trim() ?? undefined;
    }

    if (dto.isActive !== undefined) {
      category.isActive = dto.isActive;
    }

    return this.categoryRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    await this.categoryRepository.remove(category);
  }

  private async assertSlugAvailable(slug: string, skipId?: number) {
    const existing = await this.categoryRepository.findOne({
      where: { slug },
    });

    if (existing && existing.id !== skipId) {
      throw new ConflictException('Category slug already exists');
    }
  }

  private slugify(input: string): string {
    return input
      .trim()
      .toLowerCase()
      .replace(/['"]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }
}

