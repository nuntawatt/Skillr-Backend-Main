import { Controller, Post, Delete, Get, UseGuards, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth';

import { CurrentUserId } from '../progress/decorators/current-user-id.decorator';
import { WishlistService } from './wishlist.service';
import { WishlistResponseDto } from './dto/wishlist-response.dto';

@ApiTags('Wishlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post(':courseId')
  @ApiOperation({ 
    summary: 'เพิ่มหลักสูตรลงในรายการที่สนใจ',
    description: 'Add a course to user\'s wishlist'
  })
  @ApiParam({ name: 'courseId', type: 'number', example: 1 })
  @ApiOkResponse({ 
    type: WishlistResponseDto,
    description: 'Course successfully added to wishlist',
    example: {
      wishlistId: 1,
      userId: '123e4567-e89b-12d3-a456-426614174000',
      courseId: 1,
      createdAt: '2025-01-15T10:30:00.000Z'
    }
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 409, description: 'Course already in wishlist' })
  async addToWishlist(
    @CurrentUserId() userId: string,
    @Param('courseId') courseId: number,
  ): Promise<WishlistResponseDto> {
    return this.wishlistService.addToWishlist(userId, courseId);
  }

  @Delete(':courseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'ลบหลักสูตรออกจากรายการสิ่งที่อยากเรียน',
    description: 'Remove a course from user\'s wishlist'
  })
  @ApiParam({ name: 'courseId', type: 'number', example: 1 })
  @ApiResponse({ status: 204, description: 'Course removed from wishlist' })
  @ApiResponse({ status: 404, description: 'Course not found in wishlist' })
  async removeFromWishlist(
    @CurrentUserId() userId: string,
    @Param('courseId') courseId: number,
  ): Promise<void> {
    return this.wishlistService.removeFromWishlist(userId, courseId);
  }

  @Get()
  @ApiOperation({ 
    summary: 'รับสิ่งที่ปรารถนาของผู้ใช้',
    description: 'Get all courses in user\'s wishlist'
  })
  @ApiOkResponse({ 
    type: [WishlistResponseDto],
    description: 'List of courses in wishlist',
    example: [
      {
        wishlistId: 1,
        userId: '123e4567-e89b-12d3-a456-426614174000',
        courseId: 1,
        createdAt: '2025-01-15T10:30:00.000Z'
      },
      {
        wishlistId: 2,
        userId: '123e4567-e89b-12d3-a456-426614174000',
        courseId: 3,
        createdAt: '2025-01-14T15:45:00.000Z'
      }
    ]
  })
  async getWishlist(@CurrentUserId() userId: string): Promise<WishlistResponseDto[]> {
    return this.wishlistService.getWishlist(userId);
  }
}
