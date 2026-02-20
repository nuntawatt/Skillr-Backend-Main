import { Controller, Get, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@auth';
import { CurrentUserId } from './decorators/current-user-id.decorator';
import { LearnerHomeService } from './learner-home.service';
import { LearnerHomeResponseDto } from './dto/learner-home-response.dto';

@ApiTags('LearnerHome')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('learner/home')
export class LearnerHomeController {
  constructor(
    private readonly learnerHomeService: LearnerHomeService,
  ) { }

  @Get()
  @ApiOperation({
    summary: 'เพย์โหลดหน้าแรกของผู้เรียน',
    description: 'Get complete learner homepage data including profile, streak, XP, continue learning, my courses, and notifications'
  })
  @ApiOkResponse({
    type: LearnerHomeResponseDto,
    description: 'Learner homepage data successfully retrieved',
    example: {
      header: {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        displayName: 'John Doe',
        avatarUrl: 'https://cdn.example.com/avatar.png',
        xp: 120,
        streakDays: 7,
      },
      continueLearning: {
        course_id: 1,
        course_title: 'Basic TypeScript',
        chapter_title: 'Introduction to TypeScript',
        level_name: 'ระดับพื้นฐาน',
        progressPercent: 30,
      },
      myCourses: [
        {
          course_id: 2,
          title: 'Advanced JavaScript',
          progressPercent: 75,
        },
        {
          course_id: 3,
          title: 'Node.js Basics',
          progressPercent: 45,
        },
      ],
      notifications: {
        unreadCount: 0,
      },
      recommendations: {
        courses: [
          {
            course_id: 4,
            course_title: 'JavaScript Fundamentals',
            reason: 'เหมาะสำหรับผู้เริ่มต้น',
            course_imageUrl: 'https://cdn.example.com/courses/js-fundamentals.jpg',
            level_name: 'ระดับพื้นฐาน',
            course_totalChapter: 6,
          },
          {
            course_id: 5,
            course_title: 'React Advanced',
            reason: 'เหมาะสำหรับผู้มีพื้นฐาน',
            course_imageUrl: 'https://cdn.example.com/courses/react-advanced.jpg',
            level_name: 'ระดับปานกลาง',
            course_totalChapter: 8,
          },
          {
            course_id: 6,
            course_title: 'Node.js Mastery',
            reason: 'คอร์สยอดนิยม',
            course_imageUrl: 'https://cdn.example.com/courses/nodejs-mastery.jpg',
            level_name: 'ระดับยาก',
            course_totalChapter: 10,
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 500, description: 'Internal server error' })

  // ดึงข้อมูลหน้าแรกของผู้เรียน
  async getHome(@CurrentUserId() userId: string): Promise<LearnerHomeResponseDto> {
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.learnerHomeService.getHome(userId);
  }
}