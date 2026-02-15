import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { StockThaiController } from './stock-thai.controller';
import { StockThaiService } from './stock-thai.service';

@Module({
  imports: [HttpModule],
  controllers: [StockThaiController],
  providers: [StockThaiService],
  exports: [StockThaiService],
})
export class StockThaiModule {}
