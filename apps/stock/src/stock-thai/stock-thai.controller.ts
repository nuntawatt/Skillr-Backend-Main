import { Controller, Get } from '@nestjs/common';
import { StockThaiService } from './stock-thai.service';

@Controller('thai-stocks')
export class StockThaiController {
  constructor(private readonly service: StockThaiService) {}

  @Get()
  getAll() {
    return this.service.fetchAllQuotes();
  }
}