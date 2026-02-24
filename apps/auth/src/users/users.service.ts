import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

import { User } from './entities/user.entity';
import { AuthAccount } from './entities/auth-account.entity';
import { CreateUserDto, UpdateUserDto, UpdateRoleDto } from './dto';
import { AuthProvider } from '@common/enums';

@Injectable()
export class UsersService {
  private readonly s3Client: S3Client;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(AuthAccount)
    private readonly authRepo: Repository<AuthAccount>,

    private readonly config: ConfigService,
  ) {
    this.s3Client = this.createS3Client();
  }

  // =====================================================
  // USER CRUD
  // =====================================================

  // สร้าง user ใหม่ (ส่วนใหญ่ใช้สำหรับการลงทะเบียนผ่าน email/password หรือสร้างจาก Google profile)
  async create(dto: CreateUserDto): Promise<User> {
    if (dto.email) {
      const existing = await this.findByEmail(dto.email);
      if (existing) {
        throw new ConflictException('Email already exists');
      }
    }

    // const user = this.userRepo.create(dto);
    const user = this.userRepo.create({
      ...dto,
      isVerified: (dto as any).isVerified ?? false,
    });

    return this.userRepo.save(user);
  }

  // ค้นหา user ตาม ID (ใช้สำหรับแสดง profile หรือ admin ดูข้อมูล user)
  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ค้นหา user ตาม email (ใช้สำหรับการลงทะเบียนและล็อกอิน)
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  // Get all users (สำหรับ admin ดูรายชื่อผู้ใช้ทั้งหมด)
  async findAll(): Promise<User[]> {
    return this.userRepo.find();
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, dto);
    return this.userRepo.save(user);
  }

  async delete(id: string): Promise<void> {
    const result = await this.userRepo.delete(id);
    if (!result.affected) {
      throw new NotFoundException('User not found');
    }
  }

  async updateRole(id: string, dto: UpdateRoleDto): Promise<User> {
    const user = await this.findById(id);
    user.role = dto.role;
    return this.userRepo.save(user);
  }

  // =====================================================
  // AUTH ACCOUNT METHODS (AuthService ใช้ตรงนี้)
  // =====================================================

  // ค้นหา AuthAccount ตาม provider และ email (ใช้สำหรับล็อกอินด้วย email/password)
  async findAuthAccountByProviderAndEmail(
    provider: AuthProvider,
    email: string,
  ): Promise<AuthAccount | null> {
    return this.authRepo.findOne({
      where: { provider, email },
      relations: ['user'],
    });
  }

  // ค้นหา AuthAccount ตาม provider และ providerUserId (ใช้สำหรับล็อกอินด้วย Google)
  async findAuthAccountByProviderUserId(
    provider: AuthProvider,
    providerUserId: string,
  ): Promise<AuthAccount | null> {
    return this.authRepo.findOne({
      where: { provider, providerUserId },
      relations: ['user'],
    });
  }

  // สร้าง AuthAccount สำหรับ email/password (ใช้เมื่อผู้ใช้ลงทะเบียนด้วย email/password)
  async createEmailAuthAccount(
    user: User,
    email: string,
    password: string,
  ): Promise<AuthAccount> {
    const passwordHash = await argon2.hash(password);

    const account = this.authRepo.create({
      userId: user.id,
      user,
      provider: AuthProvider.LOCAL,
      email,
      passwordHash,
    });

    return this.authRepo.save(account);
  }

  // สร้างหรือค้นหา user จาก Google profile (ใช้เมื่อผู้ใช้ล็อกอินด้วย Google)
  async findOrCreateFromGoogle(profile: {
    googleId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  }): Promise<User> {
    const existingGoogle =
      await this.findAuthAccountByProviderUserId(
        AuthProvider.GOOGLE,
        profile.googleId,
      );

    if (existingGoogle?.user) {
      return existingGoogle.user;
    }

    let user = await this.findByEmail(profile.email);

    if (!user) {
      user = await this.create({
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatar: profile.avatar,
        isVerified: true,
      } as any);
    }

    await this.authRepo.save(
      this.authRepo.create({
        userId: user.id,
        user,
        provider: AuthProvider.GOOGLE,
        providerUserId: profile.googleId,
        email: profile.email,
      }),
    );

    return user;
  }

  // อัปเดตรหัสผ่าน (ใช้เมื่อผู้ใช้เปลี่ยนรหัสผ่านในโปรไฟล์)
  async updatePassword(id: string, newPassword: string) {
    const account = await this.authRepo.findOne({
      where: { userId: id, provider: AuthProvider.LOCAL },
    });

    if (!account) {
      throw new NotFoundException('Local account not found');
    }

    account.passwordHash = await argon2.hash(newPassword);
    await this.authRepo.save(account);
  }

  async verifyPasswordHash(hash: string | null, password: string) {
    if (!hash) return false;
    return argon2.verify(hash, password);
  }

  // =====================================================
  // AVATAR (S3)
  // =====================================================

  // อัปโหลดหรืออัปเดต avatar ของผู้ใช้ (ใช้เมื่อผู้ใช้อัปโหลดรูปโปรไฟล์ใหม่)
  async uploadAvatar(
    id: string,
    file: Express.Multer.File,
  ): Promise<User> {
    const user = await this.findById(id);

    if (!file?.buffer) {
      throw new BadRequestException('Invalid file');
    }

    const mediaId = randomUUID();
    const key = `profile/${mediaId}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.getBucket(),
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    user.avatar_media_id = mediaId;
    user.avatar = await this.getAvatarPresignedUrl(mediaId);

    return this.userRepo.save(user);
  }

  // ดึง URL สำหรับดาวน์โหลด avatar ของผู้ใช้ (ใช้เมื่อแอปต้องการแสดงรูปโปรไฟล์)
  async getAvatarPresignedUrl(mediaId: string): Promise<string> {
    const key = `profile/${mediaId}`;

    const cloudFront = this.config.get<string>('AWS_CLOUDFRONT_DOMAIN');

    if (cloudFront) {
      const domain = cloudFront.startsWith('http')
        ? cloudFront
        : `https://${cloudFront}`;
      return `${domain}/${key}`;
    }

    return getSignedUrl(
      this.s3Client,
      new GetObjectCommand({
        Bucket: this.getBucket(),
        Key: key,
      }),
      { expiresIn: 900 },
    );
  }

  // =====================================================
  // S3 CLIENT FIX (แก้ type error)
  // =====================================================

  private createS3Client(): S3Client {
    const region = this.config.get<string>('AWS_REGION');
    const accessKeyId = this.config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey =
      this.config.get<string>('AWS_SECRET_ACCESS_KEY');

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error('Missing AWS configuration');
    }

    return new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  private getBucket(): string {
    const bucket = this.config.get<string>('AWS_S3_BUCKET');
    if (!bucket) throw new Error('AWS_S3_BUCKET missing');
    return bucket;
  }
}
