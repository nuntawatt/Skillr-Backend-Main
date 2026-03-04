import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
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
  ) { }


  // Create a new announcement
  async create(dto: CreateAnnouncementDto): Promise<Announcement> {
    if (dto.deepLink) {
      this.assertValidDeepLink(dto.deepLink);
    }

    const announcement = this.announcementRepository.create({
      title: dto.title,
      imageUrl: dto.imageUrl ?? null,
      deepLink: dto.deepLink ?? null,
      activeStatus: dto.activeStatus ?? false,
      priority: dto.priority ?? 0,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
    });

    return this.announcementRepository.save(announcement);
  }

  // function ตรวจสอบและอัปเดตสถานะของป้ายประกาศตามวันที่และเวลาปัจจุบัน
  @Cron(CronExpression.EVERY_MINUTE)
  async syncAnnouncementStatusByDate(): Promise<void> {
    const now = new Date();

    // เปิดประกาศที่ถึงเวลาเปิดและยังไม่หมดอายุ
    const activatedResult = await this.announcementRepository
      .createQueryBuilder()
      .update(Announcement)
      .set({ activeStatus: true })
      .where('active_status = :active', { active: false })
      .andWhere('date_time IS NOT NULL')
      .andWhere('date_time <= :now', { now })
      .andWhere(
        new Brackets((qb) => {
          qb.where('end_date IS NULL').orWhere('end_date >= :now', { now });
        }),
      )
      .execute();

    // ถ้ามีการเปลี่ยนแปลงสถานะ (เปิดหรือปิด) อย่างน้อยหนึ่งป้ายประกาศ ให้ return ออกจากฟังก์ชันเพื่อหยุดการตรวจสอบเพิ่มเติม
    if (activatedResult.affected && activatedResult.affected > 0) {
      return;
    }

    // ปิดประกาศที่หมดอายุหรือยังไม่ถึงเวลาเปิด
    const deactivatedResult = await this.announcementRepository
      .createQueryBuilder()
      .update(Announcement)
      .set({ activeStatus: false })
      .where('active_status = :active', { active: true })
      .andWhere(
        new Brackets((qb) => {
          qb.where('date_time IS NOT NULL AND date_time > :now', { now })
            .orWhere('end_date IS NOT NULL AND end_date < :now', { now });
        }),
      )
      .execute();

    // ถ้ามีการเปลี่ยนแปลงสถานะ (เปิดหรือปิด) อย่างน้อยหนึ่งป้ายประกาศ ให้ return ออกจากฟังก์ชันเพื่อหยุดการตรวจสอบเพิ่มเติม
    if (deactivatedResult.affected && deactivatedResult.affected > 0) {
      return;
    }

    // ถ้าไม่มีการเปลี่ยนแปลงสถานะของป้ายประกาศใดๆ ให้ return ออกจากฟังก์ชัน
    if ((!activatedResult.affected || activatedResult.affected === 0) &&
      (!deactivatedResult.affected || deactivatedResult.affected === 0)) {
      return;
    }
  }

  async findAll(): Promise<Announcement[]> {
    return this.announcementRepository.find({
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
  }

  // ดึงป้ายประกาศที่ active และอยู่ในช่วงเวลาที่กำหนด พร้อม placeholder image ถ้าไม่มีรูปภาพ
  async findActive(limit = 3): Promise<Announcement[]> {
    const now = new Date();

    return this.announcementRepository
      .createQueryBuilder('a')
      .where('a.active_status = :active', { active: true })
      .andWhere(new Brackets((qb) => {
        qb.where('a.date_time IS NULL').orWhere('a.date_time <= :now', { now });
      }),
      )
      .andWhere(
        new Brackets((qb) => {
          qb.where('a.end_date IS NULL').orWhere('a.end_date >= :now', { now });
        }),
      )
      .orderBy('a.priority', 'DESC')
      .addOrderBy('a.created_at', 'DESC')
      .limit(limit)
      .getMany();
  }

  // อัปโหลดรูปภาพสำหรับป้ายประกาศและอัปเดต URL ในฐานข้อมูล
  async uploadBannerImage(id: number, file: Express.Multer.File): Promise<Announcement> {
    const announcement = await this.findOne(id);

    const uploaded = await this.mediaImagesService.uploadImageFileAndPersist(file);
    announcement.imageUrl = uploaded.url;

    return this.announcementRepository.save(announcement);
  }

  // ดึง URL รูปภาพ placeholder สำหรับประกาศ (ใช้เมื่อประกาศไม่มีรูปภาพ)
  getPlaceholderImageUrl(): string {
    return String('https://cdn.skllracademy.com/images/9f6e04bc-981a-43e2-947d-22f779c09f79.jpg');
  }

  // หา announcement โดยใช้ ID
  async findOne(id: number): Promise<Announcement> {
    const announcement = await this.announcementRepository.findOne({
      where: { announcement_id: id },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    return announcement;
  }

  // อัปเดตข้อมูลป้ายประกาศ
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

  // ลบป้ายประกาศ
  async remove(id: number): Promise<{ message: string }> {
    const announcement = await this.findOne(id);
    await this.announcementRepository.remove(announcement);
    return { message: `Announcement with ID ${id} deleted successfully` };
  }

  // ฟังก์ชันตรวจสอบความถูกต้องของ deepLink (ต้องเป็น relative path หรือ absolute URL)
  private assertValidDeepLink(value: string): void {
    try {
      if (value.startsWith('/')) {
        return;
      }

      // ถ้าไม่ใช่ relative path ให้ตรวจสอบว่าเป็น absolute URL ที่ถูกต้องหรือไม่
      new URL(value);
    } catch {
      throw new BadRequestException('Invalid deepLink');
    }
  }
}