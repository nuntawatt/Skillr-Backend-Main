import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
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

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() createActivityDto: CreateActivityDto) {
    return this.activitiesService.create(createActivityDto);
  }

  @Get()
  findAll(@Query('type') type?: string) {
    return this.activitiesService.findAll(type);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.activitiesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateActivityDto: UpdateActivityDto,
  ) {
    return this.activitiesService.update(id, updateActivityDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.activitiesService.remove(id);
  }

  // Register for activity
  @Post(':id/register')
  @UseGuards(JwtAuthGuard)
  register(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.activitiesService.register(id, getUserIdOrThrow(req.user));
  }

  // Cancel registration
  @Delete(':id/register')
  @UseGuards(JwtAuthGuard)
  cancelRegistration(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.activitiesService.cancelRegistration(
      id,
      getUserIdOrThrow(req.user),
    );
  }

  // Get registrations for activity
  @Get(':id/registrations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getRegistrations(@Param('id') id: string) {
    return this.activitiesService.getRegistrations(id);
  }

  // Get my registrations
  @Get('my/registrations')
  @UseGuards(JwtAuthGuard)
  getMyRegistrations(@Request() req: RequestWithUser) {
    return this.activitiesService.getMyRegistrations(
      getUserIdOrThrow(req.user),
    );
  }
}
