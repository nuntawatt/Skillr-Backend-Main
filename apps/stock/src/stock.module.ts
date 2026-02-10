import { Module } from '@nestjs/common';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { StockThaiModule } from './stock-thai/stock-thai.module';

@Module({
  imports: [StockThaiModule],
  controllers: [StockController],
  providers: [StockService],
})
export class StockModule {}
