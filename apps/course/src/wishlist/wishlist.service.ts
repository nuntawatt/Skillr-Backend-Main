import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CourseWishlist } from './entities/course-wishlist.entity';
import { WishlistResponseDto } from './dto/wishlist-response.dto';
import { Course } from '../courses/entities/course.entity';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(CourseWishlist)
    private readonly wishlistRepository: Repository<CourseWishlist>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async addToWishlist(userId: string, courseId: number): Promise<WishlistResponseDto> {
    // Check if course exists
    const course = await this.courseRepository.findOne({
      where: { course_id: courseId },
    });
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    // Check if already in wishlist
    const existing = await this.wishlistRepository.findOne({
      where: { userId, courseId },
    });
    if (existing) {
      throw new ConflictException('Course already in wishlist');
    }

    const wishlist = this.wishlistRepository.create({
      userId,
      courseId,
    });
    const saved = await this.wishlistRepository.save(wishlist);

    return {
      wishlistId: saved.wishlistId,
      userId: saved.userId,
      courseId: saved.courseId,
      createdAt: saved.createdAt.toISOString(),
    };
  }

  async removeFromWishlist(userId: string, courseId: number): Promise<void> {
    const wishlist = await this.wishlistRepository.findOne({
      where: { userId, courseId },
    });
    if (!wishlist) {
      throw new NotFoundException('Course not found in wishlist');
    }

    await this.wishlistRepository.remove(wishlist);
  }

  async getWishlist(userId: string): Promise<WishlistResponseDto[]> {
    const wishlistItems = await this.wishlistRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return wishlistItems.map(item => ({
      wishlistId: item.wishlistId,
      userId: item.userId,
      courseId: item.courseId,
      createdAt: item.createdAt.toISOString(),
    }));
  }

  async getWishlistWithCourseDetails(userId: string) {
    const wishlistItems = await this.wishlistRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    if (!wishlistItems.length) return [];

    const courseIds = wishlistItems.map(item => item.courseId);
    const courses = await this.courseRepository.find({
      where: { course_id: In(courseIds) },
    });

    const courseMap = new Map(courses.map(c => [c.course_id, c]));

    return wishlistItems
      .map(item => {
        const course = courseMap.get(item.courseId);
        if (!course) return null;
        
        return {
          courseId: course.course_id,
          title: course.course_title,
          progressPercent: 0, // Wishlist courses have 0 progress
          addedAt: item.createdAt.toISOString(),
        };
      })
      .filter(Boolean);
  }
}
