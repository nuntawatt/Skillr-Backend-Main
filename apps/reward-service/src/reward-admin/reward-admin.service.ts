import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateRewardAdminDto } from './dto/create-reward-admin.dto';
import { UpdateRewardAdminDto } from './dto/update-reward-admin.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reward } from '../reward/entities/rewards.entity';
import { randomUUID } from 'crypto';
import { StorageFactory } from 'apps/course-service/src/storage/storage.factory';

@Injectable()
export class RewardAdminService {
  constructor(
    private readonly storageFactory: StorageFactory,
    @InjectRepository(Reward, 'reward')
    private rewardRepo: Repository<Reward>,
  ) {}

  getAllReward() {
    return this.rewardRepo.find();
  }

  async getRewardDetail(id: number) {
    const reward = await this.rewardRepo.findOne({ where: { id } });

    if (!reward) {
      throw new NotFoundException('Reward not found');
    }

    return reward;
  }

  async createReward(createRewardDto: CreateRewardAdminDto, imageUrl: string) {
    const { redeem_start_date, redeem_end_date } = createRewardDto;

    if (new Date(redeem_end_date) <= new Date(redeem_start_date)) {
      throw new BadRequestException(
        'Redeem end date must be greater than start date',
      );
    }

    const rewardCreated = this.rewardRepo.create({
      ...createRewardDto,
      image_url: imageUrl,
      remain: createRewardDto.total_limit,
    });
    return await this.rewardRepo.save(rewardCreated);
  }

  async updateReward(
    id: number,
    updateRewardAdminDto: UpdateRewardAdminDto,
    imageUrl?: string,
  ) {
    const reward = await this.rewardRepo.findOne({ where: { id } });

    if (!reward) {
      throw new NotFoundException('Reward not found');
    }

    if (updateRewardAdminDto.total_limit !== undefined) {
      const redeemed = reward.total_limit - reward.remain;

      if (updateRewardAdminDto.total_limit < redeemed) {
        throw new BadRequestException(
          'Total limit cannot be less than already redeemed amount',
        );
      }

      reward.remain = updateRewardAdminDto.total_limit - redeemed;
      reward.total_limit = updateRewardAdminDto.total_limit;
    }

    if (imageUrl) {
      reward.image_url = imageUrl;
    }

    Object.assign(reward, updateRewardAdminDto);

    return await this.rewardRepo.save(reward);
  }

  async removeRewardById(id: number) {
    const reward = await this.rewardRepo.findOne({ where: { id } });

    console.log(reward);

    if (reward === null || reward === undefined) {
      throw new NotFoundException('Reward not found');
    }

    if (reward.is_active) {
      reward.is_active = false;
    }
    await this.rewardRepo.save(reward);
    await this.rewardRepo.softDelete(id);

    return {
      message: 'Deleted reward success',
    };
  }

  // ตรวจสอบ MIME type ของไฟล์ภาพที่อัพโหลดเข้ามา (รองรับ jpg/jpeg/png/webp)
  private validateImageMime(mime: string, originalName?: string) {
    const ext = (originalName ?? '').split('.').pop()?.toLowerCase();
    const allowMime = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/pjpeg',
      'image/webp',
    ];
    const allowExt = ['jpg', 'jpeg', 'png', 'webp'];

    if (allowMime.includes((mime ?? '').toLowerCase())) return;
    if (
      (mime === 'application/octet-stream' || !mime) &&
      ext &&
      allowExt.includes(ext)
    )
      return;

    throw new BadRequestException('invalid image mime type');
  }

  //Upload reward image to AWS and get url
  async uploadRewardImage(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('file missing');

    this.validateImageMime(file.mimetype, file.originalname);

    const maxSize = Number(process.env.IMAGE_MAX_SIZE_BYTES ?? 5 * 1024 * 1024);
    if (file.size > maxSize) {
      throw new BadRequestException('file too large');
    }

    const storage = this.storageFactory.image();
    const bucket = storage.bucket;

    // สร้าง storage key แบบ unique (คุณสามารถเปลี่ยน structure ได้)
    const uuid = randomUUID();
    const storageKey = `rewards/${uuid}${(file.originalname?.match(/\.[^.]+$/) ?? [''])[0]}`;

    // อัพโหลดไฟล์ไปยัง storage provider s3 หรือตามที่คุณตั้งค่าไว้
    await storage.putObject(bucket, storageKey, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });

    // สร้าง URL สาธารณะสำหรับเข้าถึงไฟล์ผ่าน CloudFront หรือ storage provider อื่น
    const publicUrl = storage.buildPublicUrl(bucket, storageKey);

    return publicUrl;
  }

  // findAll() {
  //   return `This action returns all admin`;
  // }

  // findOne(id: number) {
  //   return `This action returns a #${id} admin`;
  // }

  // update(id: number, updateAdminDto: UpdateAdminDto) {
  //   return `This action updates a #${id} admin`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} admin`;
  // }
}
