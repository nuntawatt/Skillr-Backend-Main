import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request, UnauthorizedException } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
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

@Controller('assignments')
@UseGuards(JwtAuthGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) { }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() createAssignmentDto: CreateAssignmentDto) {
    return this.assignmentsService.create(createAssignmentDto);
  }

  @Get()
  findAll(@Query('courseId') courseId?: string) {
    return this.assignmentsService.findAll(courseId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assignmentsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateAssignmentDto: UpdateAssignmentDto,
  ) {
    return this.assignmentsService.update(id, updateAssignmentDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.assignmentsService.remove(id);
  }

  // Student submission
  @Post(':id/submit')
  submit(
    @Param('id') id: string,
    @Body() submitDto: SubmitAssignmentDto,
    @Request() req: RequestWithUser,
  ) {
    return this.assignmentsService.submit(
      id,
      getUserIdOrThrow(req.user),
      submitDto,
    );
  }

  // Get submissions for an assignment
  @Get(':id/submissions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getSubmissions(@Param('id') id: string) {
    return this.assignmentsService.getSubmissions(id);
  }

  // Grade a submission
  @Patch('submissions/:submissionId/grade')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  gradeSubmission(
    @Param('submissionId') submissionId: string,
    @Body() gradeDto: GradeSubmissionDto,
  ) {
    return this.assignmentsService.gradeSubmission(submissionId, gradeDto);
  }
}
