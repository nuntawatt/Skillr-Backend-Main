import {
  Controller,
  Get,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '@auth';
import type { AuthUser } from '@auth';

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

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(
    @Request() req: RequestWithUser,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.findByUser(
      getUserIdOrThrow(req.user),
      unreadOnly === 'true',
    );
  }

  @Get('unread-count')
  getUnreadCount(@Request() req: RequestWithUser) {
    return this.notificationsService.getUnreadCount(getUserIdOrThrow(req.user));
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.notificationsService.markAsRead(id, getUserIdOrThrow(req.user));
  }

  @Patch('read-all')
  markAllAsRead(@Request() req: RequestWithUser) {
    return this.notificationsService.markAllAsRead(getUserIdOrThrow(req.user));
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.notificationsService.remove(id, getUserIdOrThrow(req.user));
  }
}
