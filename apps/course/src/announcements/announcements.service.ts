import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';

import { MediaImagesService } from '../media-images/media-images.service';
import { Announcement } from './entities/announcement.entity';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly mediaImagesService: MediaImagesService,
    @InjectRepository(Announcement)
    private readonly announcementRepository: Repository<Announcement>,
  ) {}

  async create(dto: CreateAnnouncementDto): Promise<Announcement> {
    if (dto.deepLink) {
      this.assertValidDeepLink(dto.deepLink);
    }

    const announcement = this.announcementRepository.create({
      title: dto.title,
      imageUrl: dto.imageUrl ?? null,
      deepLink: dto.deepLink ?? null,
      activeStatus: dto.activeStatus ?? true,
      priority: dto.priority ?? 0,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
    });

    return this.announcementRepository.save(announcement);
  }

  async findAll(): Promise<Announcement[]> {
    return this.announcementRepository.find({
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
  }

  async findActive(limit = 3): Promise<Announcement[]> {
    const now = new Date();

    return this.announcementRepository
      .createQueryBuilder('a')
      .where('a.active_status = :active', { active: true })
      .andWhere(
        new Brackets((qb) => {
          qb.where('a.start_date IS NULL').orWhere('a.start_date <= :now', {
            now,
          });
        }),
      )
      .andWhere(
        new Brackets((qb) => {
          qb.where('a.end_date IS NULL').orWhere('a.end_date >= :now', {
            now,
          });
        }),
      )
      .orderBy('a.priority', 'DESC')
      .addOrderBy('a.created_at', 'DESC')
      .limit(limit)
      .getMany();
  }

  async uploadBannerImage(id: number, file: Express.Multer.File): Promise<Announcement> {
    const announcement = await this.findOne(id);

    const uploaded = await this.mediaImagesService.uploadImageFileAndPersist(file);
    announcement.imageUrl = uploaded.url;

    return this.announcementRepository.save(announcement);
  }

  getPlaceholderImageUrl(): string {
    return String(process.env.ANNOUNCEMENT_BANNER_PLACEHOLDER_URL ?? '');
  }

  async findOne(id: number): Promise<Announcement> {
    const announcement = await this.announcementRepository.findOne({
      where: { announcement_id: id },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    return announcement;
  }

  async update(id: number, dto: UpdateAnnouncementDto): Promise<Announcement> {
    const announcement = await this.findOne(id);

    if (dto.deepLink) {
      this.assertValidDeepLink(dto.deepLink);
    }

    if (dto.title !== undefined) {
      announcement.title = dto.title;
    }

    if (dto.imageUrl !== undefined) {
      announcement.imageUrl = dto.imageUrl;
    }

    if (dto.deepLink !== undefined) {
      announcement.deepLink = dto.deepLink;
    }

    if (dto.activeStatus !== undefined) {
      announcement.activeStatus = dto.activeStatus;
    }

    if (dto.priority !== undefined) {
      announcement.priority = dto.priority;
    }

    if (dto.startDate !== undefined) {
      announcement.startDate = dto.startDate ? new Date(dto.startDate) : null;
    }

    if (dto.endDate !== undefined) {
      announcement.endDate = dto.endDate ? new Date(dto.endDate) : null;
    }

    return this.announcementRepository.save(announcement);
  }

  async remove(id: number): Promise<void> {
    const announcement = await this.findOne(id);
    await this.announcementRepository.remove(announcement);
  }

  private assertValidDeepLink(value: string): void {
    try {
      if (value.startsWith('/')) {
        return;
      }

      // Allow absolute URL deep link
      // eslint-disable-next-line no-new
      new URL(value);
    } catch {
      throw new BadRequestException('Invalid deepLink');
    }
  }
}
