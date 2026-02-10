import { Module } from '@nestjs/common';
import { StockThaiService } from './stock-thai.service';
import { StockThaiGateway } from './stock-thai.gateway';
import { StockThaiController } from './stock-thai.controller';

@Module({
  controllers: [StockThaiController],
  providers: [StockThaiService, StockThaiGateway],
})
export class StockThaiModule {}
