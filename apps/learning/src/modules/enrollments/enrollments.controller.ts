import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { JwtAuthGuard, RolesGuard, Roles } from '@auth';
import type { AuthUser } from '@auth';
import { UserRole } from '@common/enums';

type RequestWithUser = {
  user?: AuthUser;
};

function getUserIdOrThrow(user?: AuthUser): string {
  const raw = user?.id ?? user?.sub;
  if (typeof raw === 'string' || typeof raw === 'number') {
    return String(raw);
  }
  throw new UnauthorizedException();
}

@Controller('enrollments')
@UseGuards(JwtAuthGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post('courses/:courseId')
  enroll(@Param('courseId') courseId: string, @Request() req: RequestWithUser) {
    return this.enrollmentsService.enroll(getUserIdOrThrow(req.user), courseId);
  }

  @Get('my')
  getMyEnrollments(@Request() req: RequestWithUser) {
    return this.enrollmentsService.findByStudent(getUserIdOrThrow(req.user));
  }

  @Get('courses/:courseId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getCourseEnrollments(@Param('courseId') courseId: string) {
    return this.enrollmentsService.findByCourse(courseId);
  }

  @Get('courses/:courseId/check')
  checkEnrollment(
    @Param('courseId') courseId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.enrollmentsService.checkEnrollment(
      getUserIdOrThrow(req.user),
      courseId,
    );
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(@Query('status') status?: string) {
    return this.enrollmentsService.findAll(status);
  }
}
