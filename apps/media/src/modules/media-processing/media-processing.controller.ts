import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MediaProcessingService } from './media-processing.service';
import { CreateMediaProcessingDto } from './dto/transcode-video.dto';
import { UpdateMediaProcessingDto } from './dto/update-media-processing.dto';

@Controller('media-processing')
export class MediaProcessingController {
  constructor(private readonly mediaProcessingService: MediaProcessingService) {}

  @Post()
  create(@Body() createMediaProcessingDto: CreateMediaProcessingDto) {
    return this.mediaProcessingService.create(createMediaProcessingDto);
  }

  @Get()
  findAll() {
    return this.mediaProcessingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mediaProcessingService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMediaProcessingDto: UpdateMediaProcessingDto) {
    return this.mediaProcessingService.update(+id, updateMediaProcessingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.mediaProcessingService.remove(+id);
  }
}
