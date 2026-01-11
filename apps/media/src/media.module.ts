import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from '@config/database.config';
import { AuthLibModule } from '@auth/auth-lib.module';
import { MediaImagesModule } from './media-images/media-images.module';
import { MediaVideosModule } from './media-videos/media-videos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/media/.env', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
    AuthLibModule,
    MediaImagesModule,
    MediaVideosModule,
  ],
})
export class AppModule {}
