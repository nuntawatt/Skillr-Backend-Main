import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { User } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto, UpdateRoleDto } from './dto';
import { AuthProvider } from '@common/enums';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // Create a new user
  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const user = this.userRepository.create({
      email: createUserDto.email,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      googleId: createUserDto.googleId,
      avatar: createUserDto.avatar,
      provider: createUserDto.provider,
      role: createUserDto.role,
      passwordHash: createUserDto.password
        ? await argon2.hash(createUserDto.password)
        : undefined,
    });

    return this.userRepository.save(user);
  }

  // Find user by ID
  async findById(id: number | string): Promise<User | null> {
    const numericId = typeof id === 'string' ? Number(id) : id;
    if (!Number.isFinite(numericId)) {
      return null;
    }
    return this.userRepository.findOne({ where: { id: numericId } });
  }

  // Find user by email
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  // Find user by Google ID
  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { googleId } });
  }

  // Find or create user from Google OAuth
  async findOrCreateFromGoogle(profile: {
    googleId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  }): Promise<User> {
    let user = await this.findByGoogleId(profile.googleId);
    if (user) {
      return user;
    }

    // Then try to find by email and link Google account
    user = await this.findByEmail(profile.email);
    if (user) {
      user.googleId = profile.googleId;
      user.provider = AuthProvider.GOOGLE;
      if (!user.avatar && profile.avatar) {
        user.avatar = profile.avatar;
      }
      return this.userRepository.save(user);
    }

    // Create new user
    const newUser = this.userRepository.create({
      email: profile.email,
      googleId: profile.googleId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatar: profile.avatar,
      provider: AuthProvider.GOOGLE,
      passwordHash: await argon2.hash(crypto.randomBytes(32).toString('hex')),
      isVerified: true,
    });

    return this.userRepository.save(newUser);
  }

  // Update user details
  async update(
    id: number | string,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
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

    user.passwordHash = await argon2.hash(newPassword);
    await this.userRepository.save(user);
  }

  // Verify user password
  async verifyPassword(user: User, password: string): Promise<boolean> {
    if (!user.passwordHash) {
      return false;
    }
    return argon2.verify(user.passwordHash, password);
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
        'role',
        'provider',
        'isVerified',
        'createdAt',
      ],
    });
  }

  // Delete user
  async delete(id: number | string): Promise<void> {
    const numericId = typeof id === 'string' ? Number(id) : id;
    const result = await this.userRepository.delete(numericId);
    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
  }
}
