import { Controller, Get, Patch, Param, Body, UseGuards, Request, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { UsersService } from './users.service';
import { UpdateUserDto, UpdateRoleDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@common/enums';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';

type AuthedRequest = ExpressRequest & { user: { id: string } };

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  // Get current user profile
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile retrieved successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized. Invalid or missing JWT token.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async getProfile(@Request() req: AuthedRequest) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) {
      return null;
    }
    return user;
  }

  // Update current user profile
  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'User profile updated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request. Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized. Invalid or missing JWT token.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async updateProfile(
    @Request() req: AuthedRequest,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.usersService.update(req.user.id, updateUserDto);
    return user;
  }

  // Get all users (Admin only)
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of all users retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized. Invalid or missing JWT token.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Insufficient permissions.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async findAll() {
    return this.usersService.findAll();
  }

  // Get user by ID (Admin only)
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized. Invalid or missing JWT token.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Not Found. User does not exist.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      return null;
    }
    return user;
  }

  // Update user role (Admin only)
  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user role' })
  @ApiBody({ type: UpdateRoleDto })
  @ApiResponse({ status: 200, description: 'User role updated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request. Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized. Invalid or missing JWT token.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Insufficient permissions.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async updateRole(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    const user = await this.usersService.updateRole(id, updateRoleDto);
    return user;
  }

  // Delete user (Admin only)
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 204, description: 'User deleted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized. Invalid or missing JWT token.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Insufficient permissions.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.usersService.delete(id);
  }
}
