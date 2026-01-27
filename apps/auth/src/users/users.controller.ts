import { Controller, Get, Patch, Param, Body, UseGuards, Request, Delete, HttpCode, HttpStatus, UseInterceptors, UploadedFile, BadRequestException, Post, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';

import type { Response, Request as ExpressRequest } from 'express';
import { UsersService } from './users.service';
import { UpdateUserDto, UpdateRoleDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@common/enums';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';

type AuthedRequest = ExpressRequest & { user: { id: string } };

@ApiTags('Users')
@Controller('users')
@ApiBearerAuth()
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

  @Patch('profile/avatar')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, cb) => {
        const ok = file.mimetype === 'image/jpeg' || file.mimetype === 'image/png';
        if (!ok) return cb(new BadRequestException('Only JPG and PNG are allowed'), false);
        cb(null, true);
      },
    }),
  )
  async uploadAvatar(@Request() req: AuthedRequest, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');
    const updated = await this.usersService.uploadAvatar(req.user.id, file);
    return updated;
  }

  @Get('profile/:key')
    @ApiOperation({ summary: 'Public: presign avatar by key and redirect' })
    @ApiResponse({ status: 302, description: 'Redirects to presigned avatar URL.' })
    @ApiResponse({ status: 404, description: 'Not found.' })
    async getProfileAvatarByKey(@Param('key') key: string, @Res() res: Response) {
      const url = await this.usersService.getAvatarPresignedUrlByMediaId(key);
      return res.redirect(url);
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
