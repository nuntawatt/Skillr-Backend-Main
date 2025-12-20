import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { JwtAuthGuard, RolesGuard, Roles } from '@auth';
import { UserRole } from '@common/enums';

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
  update(@Param('id') id: string, @Body() updateActivityDto: UpdateActivityDto) {
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
  register(@Param('id') id: string, @Request() req) {
    return this.activitiesService.register(id, req.user.id);
  }

  // Cancel registration
  @Delete(':id/register')
  @UseGuards(JwtAuthGuard)
  cancelRegistration(@Param('id') id: string, @Request() req) {
    return this.activitiesService.cancelRegistration(id, req.user.id);
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
  getMyRegistrations(@Request() req) {
    return this.activitiesService.getMyRegistrations(req.user.id);
  }
}
