// src/modules/media-processing/media-processing.module.ts
import { Module } from '@nestjs/common';
import { MediaProcessingService } from './media-processing.service';
import { MediaProcessingController } from './media-processing.controller';
import { MediaAssetsModule } from '../media-assets/media-assets.module';
import { ContentModule } from '../content/content.module'; 

@Module({
  imports: [MediaAssetsModule, ContentModule],
  providers: [MediaProcessingService],
  controllers: [MediaProcessingController]
})

export class MediaProcessingModule {}
