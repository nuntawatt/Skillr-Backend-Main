import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import * as Minio from 'minio';
import { randomUUID } from 'crypto';
import { User } from './entities/user.entity';
import { AuthAccount } from './entities/auth-account.entity';
import { CreateUserDto, UpdateUserDto, UpdateRoleDto } from './dto';
import { AuthProvider } from '@common/enums';

@Injectable()
export class UsersService {
  private minioClient?: Minio.Client;
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AuthAccount)
    private readonly authAccountRepository: Repository<AuthAccount>,
    private readonly config: ConfigService,
  ) { }

  // Create a new user
  async create(createUserDto: CreateUserDto): Promise<User> {
    if (createUserDto.email) {
      const existingUser = await this.findByEmail(createUserDto.email);
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }

    const user = this.userRepository.create({
      email: createUserDto.email,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      avatar: createUserDto.avatar,
      avatar_media_id: (createUserDto as any).avatar_media_id ?? null,
      role: createUserDto.role,
    });

    return this.userRepository.save(user);
  }

  // Get a fresh presigned avatar URL for a given media id
  async getAvatarPresignedUrlByMediaId(mediaId: string): Promise<string> {
    if (!mediaId) throw new NotFoundException('mediaId is required');

    const endpointRaw = this.config.get<string>('S3_ENDPOINT') ?? this.config.get<string>('MINIO_ENDPOINT') ?? '';
    if (!endpointRaw) throw new BadRequestException('S3_ENDPOINT not configured');

    const bucket = this.config.get<string>('S3_BUCKET') ?? 'auth-profile';
    const prefix = this.config.get<string>('S3_AVATAR_PREFIX') ?? 'avatar';

    const client = this.getMinioClient(endpointRaw);

    // Find the object key under the avatar prefix that starts with the mediaId
    const searchPrefix = `${prefix}/${mediaId}`;
    const foundKey: string | null = await new Promise((resolve, reject) => {
      const stream = client.listObjectsV2(bucket, searchPrefix, true);
      let resolved = false;
      stream.on('data', (obj: any) => {
        if (!resolved && obj && obj.name) {
          resolved = true;
          resolve(obj.name);
          stream.destroy();
        }
      });
      stream.on('error', (err: Error) => {
        if (!resolved) {
          resolved = true;
          reject(err);
        }
      });
      stream.on('end', () => {
        if (!resolved) {
          resolved = true;
          resolve(null);
        }
      });
    });

    if (!foundKey) throw new NotFoundException('Avatar object not found in bucket');

    const expires = Number(this.config.get<number>('S3_SIGNED_URL_EXPIRES_SECONDS')) || 900;
    const presignedUrl: string = await new Promise((resolve, reject) => {
      // @ts-ignore
      client.presignedGetObject(bucket, foundKey, expires, (err: Error | null, url?: string) => {
        if (err) return reject(err);
        resolve(url!);
      });
    });

    return presignedUrl;
  }

  // Find user by ID
  async findById(id: number | string): Promise<User | null> {
    const lookupId = typeof id === 'string' ? id : String(id);
    if (!lookupId) {
      return null;
    }
    return this.userRepository.findOne({ where: { id: lookupId } });
  }

  // Find user by email
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findAuthAccountByProviderAndEmail(
    provider: AuthProvider,
    email: string,
  ): Promise<AuthAccount | null> {
    return this.authAccountRepository.findOne({
      where: { provider, email },
      relations: ['user'],
    });
  }

  async findAuthAccountByProviderUserId(
    provider: AuthProvider,
    providerUserId: string,
  ): Promise<AuthAccount | null> {
    return this.authAccountRepository.findOne({
      where: { provider, providerUserId },
      relations: ['user'],
    });
  }

  async createEmailAuthAccount(
    user: User,
    email: string,
    password: string,
  ): Promise<AuthAccount> {
    const passwordHash = await argon2.hash(password);
    const account = this.authAccountRepository.create({
      userId: user.id,
      user,
      provider: AuthProvider.LOCAL,
      providerUserId: null,
      email,
      passwordHash,

    });
    return this.authAccountRepository.save(account);
  }

  // Find or create user from Google OAuth
  async findOrCreateFromGoogle(profile: {
    googleId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  }): Promise<User> {

    // 1. หา Google auth account ก่อน (primary key)
    const existingGoogleAccount =
      await this.findAuthAccountByProviderUserId(
        AuthProvider.GOOGLE,
        profile.googleId,
      );

    if (existingGoogleAccount?.user) {
      return existingGoogleAccount.user;
    }

    // 2. หา user ด้วย email (secondary)
    let user: User | null = null;

    if (profile.email) {
      user = await this.findByEmail(profile.email);

      // ถ้าเจอ user แต่เป็น LOCAL-only account
      if (user) {
        const existingLocalAccount =
          await this.findAuthAccountByProviderAndEmail(
            AuthProvider.LOCAL,
            profile.email,
          );

        if (existingLocalAccount) {
          // policy: ไม่ auto-merge
          // ป้องกัน account takeover
          throw new ConflictException(
            'Email already registered with password login',
          );
        }
      }
    }

    // 3. ถ้าไม่มี user → สร้างใหม่
    if (!user) {
      user = this.userRepository.create({
        email: profile.email || null,
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatar: profile.avatar,
        isVerified: true,
      });

      user = await this.userRepository.save(user);
    } else {
      // 4. ถ้ามี user อยู่แล้ว → update profile แบบ safe
      let shouldUpdate = false;

      if (!user.firstName && profile.firstName) {
        user.firstName = profile.firstName;
        shouldUpdate = true;
      }

      if (!user.lastName && profile.lastName) {
        user.lastName = profile.lastName;
        shouldUpdate = true;
      }

      if (!user.avatar && profile.avatar) {
        user.avatar = profile.avatar;
        shouldUpdate = true;
      }

      if (!user.isVerified) {
        user.isVerified = true;
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        user = await this.userRepository.save(user);
      }
    }

    // 5. สร้าง Google auth account
    const account = this.authAccountRepository.create({
      userId: user.id,
      user,
      provider: AuthProvider.GOOGLE,
      providerUserId: profile.googleId,
      email: profile.email || null,
      passwordHash: null,
    });

    await this.authAccountRepository.save(account);

    return user;
  }

  // Update user details
  async update(id: number | string, updateUserDto: UpdateUserDto,): Promise<User> {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  // Upload avatar image to media MinIO and update user.avatar with public URL
  async uploadAvatar(id: number | string, file: Express.Multer.File): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');

    if (!file || !file.buffer) throw new BadRequestException('File is required');
    if (!file.mimetype || (file.mimetype !== 'image/jpeg' && file.mimetype !== 'image/png')) throw new BadRequestException('Only JPG and PNG are allowed');

    // read config values instead of hardcoding
    const endpointRaw = this.config.get<string>('S3_ENDPOINT') ?? this.config.get<string>('MINIO_ENDPOINT') ?? '';
    if (!endpointRaw) throw new BadRequestException('S3_ENDPOINT not configured');

    const bucket = this.config.get<string>('S3_BUCKET') ?? 'auth-profile';
    const prefix = this.config.get<string>('S3_AVATAR_PREFIX') ?? 'avatar';

    // create or reuse MinIO client
    const client = this.getMinioClient(endpointRaw);

    const ext = (() => {
      const m = file.originalname?.match(/\.([a-z0-9]+)$/i);
      if (m) return `.${m[1]}`;
      return file.mimetype === 'image/png' ? '.png' : '.jpg';
    })();
    // generate media id and use it as the object key under the avatar prefix
    const mediaId = randomUUID();
    const key = `${prefix}/${mediaId}${ext}`;

    await client.putObject(bucket, key, file.buffer, file.size ?? file.buffer.length, { 'Content-Type': file.mimetype });

    // generate a presigned GET URL so the client can view immediately
    const expires = Number(this.config.get<number>('S3_SIGNED_URL_EXPIRES_SECONDS')) || 900;
    const presignedUrl: string = await new Promise((resolve, reject) => {
      // Minio client uses a callback-style presignedGetObject
      // @ts-ignore
      client.presignedGetObject(bucket, key, expires, (err: Error | null, url?: string) => {
        if (err) return reject(err);
        resolve(url!);
      });
    });

    // save media id and presigned URL
    user.avatar_media_id = mediaId;
    user.avatar = presignedUrl;
    return this.userRepository.save(user);
  }

  private getMinioClient(endpointRaw: string): Minio.Client {
    if (this.minioClient) return this.minioClient;

    const url = new URL(endpointRaw);
    const accessKey = this.config.get<string>('S3_ACCESS_KEY_ID') ?? this.config.get<string>('MINIO_ROOT_USER') ?? '';
    const secretKey = this.config.get<string>('S3_SECRET_ACCESS_KEY') ?? this.config.get<string>('MINIO_ROOT_PASSWORD') ?? '';

    this.minioClient = new Minio.Client({
      endPoint: url.hostname,
      port: Number(url.port || 9000),
      // useSSL should be true for https
      useSSL: url.protocol === 'https:',
      accessKey,
      secretKey,
    });

    return this.minioClient;
  }

  // Update user role
  async updateRole(
    id: number | string,
    updateRoleDto: UpdateRoleDto,
  ): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.role = updateRoleDto.role;
    return this.userRepository.save(user);
  }

  // Update user password
  async updatePassword(
    id: number | string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const account = await this.authAccountRepository.findOne({
      where: { userId: user.id, provider: AuthProvider.LOCAL },
    });
    if (!account) {
      throw new NotFoundException('Local auth account not found');
    }

    account.passwordHash = await argon2.hash(newPassword);
    await this.authAccountRepository.save(account);
  }

  // Verify user password
  async verifyPasswordHash(passwordHash: string | null, password: string): Promise<boolean> {
    if (!passwordHash) {
      return false;
    }
    return argon2.verify(passwordHash, password);
  }

  // Get all users
  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'avatar',
        'avatar_media_id',
        'role',
        'isVerified',
        'createdAt',
      ],
    });
  }

  // Delete user
  async delete(id: number | string): Promise<void> {
    const lookupId = typeof id === 'string' ? id : String(id);
    const result = await this.userRepository.delete(lookupId);
    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
  }
}
