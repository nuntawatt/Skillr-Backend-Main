import { Test, TestingModule } from '@nestjs/testing';
import { WishlistService } from './wishlist.service';
import { WishlistResponseDto } from './dto/wishlist-response.dto';
import { NotFoundException, ConflictException } from '@nestjs/common';

jest.mock(
  '@auth',
  () => ({
    JwtAuthGuard: class JwtAuthGuard {},
  }),
  { virtual: true },
);

 jest.mock('../progress/decorators/current-user-id.decorator', () => ({
   CurrentUserId: () => () => undefined,
 }));

const { WishlistController } = require('./wishlist.controller');

describe('WishlistController', () => {
  let controller: InstanceType<typeof WishlistController>;
  let service: WishlistService;

  const mockUserId = 'test-user-id';
  const mockCourseId = 1;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WishlistController],
      providers: [
        {
          provide: WishlistService,
          useValue: {
            addToWishlist: jest.fn(),
            removeFromWishlist: jest.fn(),
            getWishlist: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InstanceType<typeof WishlistController>>(WishlistController);
    service = module.get<WishlistService>(WishlistService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('addToWishlist', () => {
    it('should add course to wishlist successfully', async () => {
      const mockResponse: WishlistResponseDto = {
        wishlistId: 1,
        userId: mockUserId,
        courseId: mockCourseId,
        createdAt: new Date().toISOString(),
      };

      jest.spyOn(service, 'addToWishlist').mockResolvedValue(mockResponse);

      const result = await controller.addToWishlist(mockUserId, mockCourseId);

      expect(service.addToWishlist).toHaveBeenCalledWith(mockUserId, mockCourseId);
      expect(result).toEqual(mockResponse);
    });

    it('should throw NotFoundException when course does not exist', async () => {
      jest.spyOn(service, 'addToWishlist').mockRejectedValue(
        new NotFoundException('Course not found'),
      );

      await expect(controller.addToWishlist(mockUserId, mockCourseId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when course already in wishlist', async () => {
      jest.spyOn(service, 'addToWishlist').mockRejectedValue(
        new ConflictException('Course already in wishlist'),
      );

      await expect(controller.addToWishlist(mockUserId, mockCourseId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('removeFromWishlist', () => {
    it('should remove course from wishlist successfully', async () => {
      jest.spyOn(service, 'removeFromWishlist').mockResolvedValue(undefined);

      await expect(
        controller.removeFromWishlist(mockUserId, mockCourseId),
      ).resolves.toBeUndefined();

      expect(service.removeFromWishlist).toHaveBeenCalledWith(mockUserId, mockCourseId);
    });

    it('should throw NotFoundException when wishlist item not found', async () => {
      jest.spyOn(service, 'removeFromWishlist').mockRejectedValue(
        new NotFoundException('Wishlist item not found'),
      );

      await expect(
        controller.removeFromWishlist(mockUserId, mockCourseId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getWishlist', () => {
    it('should return user wishlist', async () => {
      const mockWishlist: WishlistResponseDto[] = [
        {
          wishlistId: 1,
          userId: mockUserId,
          courseId: 1,
          createdAt: new Date().toISOString(),
        },
        {
          wishlistId: 2,
          userId: mockUserId,
          courseId: 2,
          createdAt: new Date().toISOString(),
        },
      ];

      jest.spyOn(service, 'getWishlist').mockResolvedValue(mockWishlist);

      const result = await controller.getWishlist(mockUserId);

      expect(service.getWishlist).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockWishlist);
    });

    it('should return empty array when user has no wishlist items', async () => {
      jest.spyOn(service, 'getWishlist').mockResolvedValue([]);

      const result = await controller.getWishlist(mockUserId);

      expect(result).toEqual([]);
    });
  });
});
