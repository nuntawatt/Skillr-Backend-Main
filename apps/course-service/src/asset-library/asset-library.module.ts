import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AssetLibraryController } from './asset-library.controller';
import { JwtAuthGuard, RolesGuard } from '@auth';
import { StorageModule } from '../storage/storage.module';
import { AssetLibraryService } from './asset-library.service';
import { AssetImage } from './entities/asset-image.entity';
import { AssetVideo } from './entities/asset-video.entity';

@Module({
    imports: [TypeOrmModule.forFeature([AssetImage, AssetVideo]), StorageModule],
    controllers: [AssetLibraryController],
    providers: [AssetLibraryService, JwtAuthGuard, RolesGuard],
})
export class AssetLibraryModule { }
