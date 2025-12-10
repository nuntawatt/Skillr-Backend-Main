import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getgetHome_api(): string {
    return this.appService.getHome_api();
  }
  
}
