import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from './entities/user.entity';
import { AuthAccount } from './entities/auth-account.entity';
import { CreateUserDto, UpdateUserDto, UpdateRoleDto } from './dto';
import { AuthProvider } from '@common/enums';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AuthAccount)
    private readonly authAccountRepository: Repository<AuthAccount>,
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
      role: createUserDto.role,
    });

    return this.userRepository.save(user);
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
    const existingAccount = await this.findAuthAccountByProviderUserId(
      AuthProvider.GOOGLE,
      profile.googleId,
    );
    if (existingAccount?.user) {
      return existingAccount.user;
    }

    let user = profile.email ? await this.findByEmail(profile.email) : null;
    if (!user) {
      user = this.userRepository.create({
        email: profile.email || null,
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatar: profile.avatar,
        isVerified: true,
      });
      user = await this.userRepository.save(user);
    } else if (!user.avatar && profile.avatar) {
      user.avatar = profile.avatar;
      user = await this.userRepository.save(user);
    }

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
