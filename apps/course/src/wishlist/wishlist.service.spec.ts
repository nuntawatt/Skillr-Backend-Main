import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { WishlistService } from './wishlist.service';
import { CourseWishlist } from './entities/course-wishlist.entity';
import { Course } from '../courses/entities/course.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('WishlistService', () => {
  let service: WishlistService;
  let wishlistRepo: jest.Mocked<Partial<Repository<CourseWishlist>>>;
  let courseRepo: jest.Mocked<Partial<Repository<Course>>>;

  const mockUserId = 'test-user-id';
  const mockCourseId = 1;

  beforeEach(async () => {
    wishlistRepo = {
      findOne: jest.fn(),
      create: (jest.fn((x: any) => x) as any),
      save: jest.fn(),
      remove: jest.fn(),
      find: jest.fn(),
    };

    courseRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WishlistService,
        {
          provide: getRepositoryToken(CourseWishlist),
          useValue: wishlistRepo,
        },
        {
          provide: getRepositoryToken(Course),
          useValue: courseRepo,
        },
      ],
    }).compile();

    service = module.get<WishlistService>(WishlistService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addToWishlist', () => {
    it('should add course to wishlist successfully', async () => {
      // Mock course exists
      (courseRepo.findOne as jest.Mock).mockResolvedValue({
        course_id: mockCourseId,
        course_title: 'Test Course',
      });

      // Mock wishlist item doesn't exist
      (wishlistRepo.findOne as jest.Mock).mockResolvedValue(null);

      // Mock save operation
      const mockWishlistItem = {
        wishlistId: 1,
        userId: mockUserId,
        courseId: mockCourseId,
        createdAt: new Date(),
      };
      (wishlistRepo.save as jest.Mock).mockResolvedValue(mockWishlistItem);

      const result = await service.addToWishlist(mockUserId, mockCourseId);

      expect(courseRepo.findOne).toHaveBeenCalledWith({
        where: { course_id: mockCourseId },
      });

      expect(wishlistRepo.findOne).toHaveBeenCalledWith({
        where: { userId: mockUserId, courseId: mockCourseId },
      });

      expect(wishlistRepo.create).toHaveBeenCalledWith({ userId: mockUserId, courseId: mockCourseId });
      expect(wishlistRepo.save).toHaveBeenCalled();

      expect(result).toEqual({
        wishlistId: 1,
        userId: mockUserId,
        courseId: mockCourseId,
        createdAt: mockWishlistItem.createdAt.toISOString(),
      });
    });

    it('should throw NotFoundException when course does not exist', async () => {
      (courseRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.addToWishlist(mockUserId, mockCourseId)).rejects.toThrow(
        NotFoundException,
      );

      expect(courseRepo.findOne).toHaveBeenCalledWith({
        where: { course_id: mockCourseId },
      });
    });

    it('should throw ConflictException when course already in wishlist', async () => {
      (courseRepo.findOne as jest.Mock).mockResolvedValue({
        course_id: mockCourseId,
        course_title: 'Test Course',
      });

      (wishlistRepo.findOne as jest.Mock).mockResolvedValue({
        wishlistId: 1,
        userId: mockUserId,
        courseId: mockCourseId,
        createdAt: new Date(),
      });

      await expect(service.addToWishlist(mockUserId, mockCourseId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('removeFromWishlist', () => {
    it('should remove course from wishlist successfully', async () => {
      const mockWishlistItem = {
        wishlistId: 1,
        userId: mockUserId,
        courseId: mockCourseId,
        createdAt: new Date(),
      };

      (wishlistRepo.findOne as jest.Mock).mockResolvedValue(mockWishlistItem);
      (wishlistRepo.remove as jest.Mock).mockResolvedValue(mockWishlistItem);

      await service.removeFromWishlist(mockUserId, mockCourseId);

      expect(wishlistRepo.findOne).toHaveBeenCalledWith({
        where: { userId: mockUserId, courseId: mockCourseId },
      });

      expect(wishlistRepo.remove).toHaveBeenCalledWith(mockWishlistItem);
    });

    it('should throw NotFoundException when wishlist item not found', async () => {
      (wishlistRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.removeFromWishlist(mockUserId, mockCourseId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getWishlist', () => {
    it('should return user wishlist items', async () => {
      const mockWishlistItems = [
        {
          wishlistId: 1,
          userId: mockUserId,
          courseId: 1,
          createdAt: new Date(),
        },
        {
          wishlistId: 2,
          userId: mockUserId,
          courseId: 2,
          createdAt: new Date(),
        },
      ];

      (wishlistRepo.find as jest.Mock).mockResolvedValue(mockWishlistItems);

      const result = await service.getWishlist(mockUserId);

      expect(wishlistRepo.find).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        order: { createdAt: 'DESC' },
      });

      expect(result).toEqual(
        mockWishlistItems.map((i) => ({
          wishlistId: i.wishlistId,
          userId: i.userId,
          courseId: i.courseId,
          createdAt: i.createdAt.toISOString(),
        })),
      );
    });

    it('should return empty array when user has no wishlist items', async () => {
      (wishlistRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.getWishlist(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('getWishlistWithCourseDetails', () => {
    it('should return wishlist items with course details', async () => {
      const mockWishlistItems = [
        {
          wishlistId: 1,
          userId: mockUserId,
          courseId: 1,
          createdAt: new Date(),
        },
      ];

      const mockCourses = [
        {
          course_id: 1,
          course_title: 'Test Course',
        },
      ];

      (wishlistRepo.find as jest.Mock).mockResolvedValue(mockWishlistItems);
      (courseRepo.find as jest.Mock).mockResolvedValue(mockCourses);

      const result = await service.getWishlistWithCourseDetails(mockUserId);

      expect(wishlistRepo.find).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        order: { createdAt: 'DESC' },
      });

      expect(courseRepo.find).toHaveBeenCalledWith({
        where: { course_id: In([1]) },
      });

      expect(result).toEqual([
        {
          courseId: 1,
          title: 'Test Course',
          progressPercent: 0,
          addedAt: mockWishlistItems[0].createdAt.toISOString(),
        },
      ]);
    });

    it('should handle empty wishlist gracefully', async () => {
      (wishlistRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.getWishlistWithCourseDetails(mockUserId);

      expect(result).toEqual([]);
      expect(courseRepo.find).not.toHaveBeenCalled();
    });
  });
});
