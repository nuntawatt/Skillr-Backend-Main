import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnouncementsModule } from '../announcements/announcements.module';



import { NotificationsService } from './notifications.service';

import { NotificationsController } from './notifications.controller';

import { Notification } from './entities/notification.entity';



@Module({

  imports: [

    TypeOrmModule.forFeature([Notification]),
    AnnouncementsModule,

  ],

  controllers: [NotificationsController],

  providers: [NotificationsService],

  exports: [NotificationsService],

})

export class NotificationsModule {}

