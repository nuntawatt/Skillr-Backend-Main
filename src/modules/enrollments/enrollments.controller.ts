import { Controller, Get, Post, Param, UseGuards, Request, Query } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@Controller('enrollments')
@UseGuards(JwtAuthGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post('courses/:courseId')
  enroll(@Param('courseId') courseId: string, @Request() req) {
    return this.enrollmentsService.enroll(req.user.id, courseId);
  }

  @Get('my')
  getMyEnrollments(@Request() req) {
    return this.enrollmentsService.findByStudent(req.user.id);
  }

  @Get('courses/:courseId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  getCourseEnrollments(@Param('courseId') courseId: string) {
    return this.enrollmentsService.findByCourse(courseId);
  }

  @Get('courses/:courseId/check')
  checkEnrollment(@Param('courseId') courseId: string, @Request() req) {
    return this.enrollmentsService.checkEnrollment(req.user.id, courseId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(@Query('status') status?: string) {
    return this.enrollmentsService.findAll(status);
  }
}
