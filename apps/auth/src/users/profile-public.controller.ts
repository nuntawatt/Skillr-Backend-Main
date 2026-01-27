import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { UsersService } from './users.service';

@ApiTags('Users (Public)')
@Controller('users')
export class ProfilePublicController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile/:key')
  @ApiOperation({ summary: 'Public: presign avatar by key and redirect' })
  @ApiResponse({ status: 302, description: 'Redirects to presigned avatar URL.' })
  @ApiResponse({ status: 404, description: 'Not found.' })
  async getProfileAvatarByKey(@Param('key') key: string, @Res() res: Response) {
    const url = await this.usersService.getAvatarPresignedUrlByMediaId(key);
    return res.redirect(url);
  }
}
