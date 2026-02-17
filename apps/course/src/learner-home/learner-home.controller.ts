import { Controller, Get, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth';

import { CurrentUserId } from '../progress/decorators/current-user-id.decorator';
import { LearnerHomeService } from './learner-home.service';
import { LearnerHomeResponseDto } from './dto/learner-home-response.dto';

/**
 * Learner Home Controller
 * 
 * Handles requests related to the learner's home page
 */
@ApiTags('LearnerHome')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('learner/home')
export class LearnerHomeController {
  constructor(private readonly learnerHomeService: LearnerHomeService) {}

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
        streakDays: 7
      },
      continueLearning: {
        courseId: 1,
        courseTitle: 'Basic TypeScript',
        lessonId: 10,
        lessonTitle: 'Intro',
        progressPercent: 30
      },
      myCourses: [
        {
          courseId: 2,
          title: 'Advanced JavaScript',
          progressPercent: 75
        },
        {
          courseId: 3,
          title: 'Node.js Basics',
          progressPercent: 45
        }
      ],
      notifications: {
        unreadCount: 3
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  getHome(@CurrentUserId() userId: string): Promise<LearnerHomeResponseDto> {
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.learnerHomeService.getHome(userId);
  }
}
