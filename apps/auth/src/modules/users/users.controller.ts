import { Controller, Get, Patch, Param, Body, UseGuards, Request, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { UsersService } from './users.service';
import { UpdateUserDto, UpdateRoleDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@common/enums';

type AuthedRequest = ExpressRequest & { user: { id: number } };

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  // Get current user profile
  @Get('myself')
  async getProfile(@Request() req: AuthedRequest) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) {
      return null;
    }
    const { passwordHash: _passwordHash, ...result } = user;
    void _passwordHash;
    return result;
  }

  // Update current user profile
  @Patch('myself')
  async updateProfile(
    @Request() req: AuthedRequest,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.usersService.update(req.user.id, updateUserDto);
    const { passwordHash: _passwordHash, ...result } = user;
    void _passwordHash;
    return result;
  }

  // Get all users (Admin)
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll() {
    return this.usersService.findAll();
  }

  // Get user by ID (Admin)
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      return null;
    }
    const { passwordHash: _passwordHash, ...result } = user;
    void _passwordHash;
    return result;
  }

  // Delete user (Admin)
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.usersService.delete(id);
  }
}

// Admin Controller for role management
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) { }

  // Update user role (Admin)
  @Patch(':id/role')
  async updateRole(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    const user = await this.usersService.updateRole(id, updateRoleDto);
    const { passwordHash: _passwordHash, ...result } = user;
    void _passwordHash;
    return {
      message: 'User role updated successfully',
      user: result,
    };
  }
}
