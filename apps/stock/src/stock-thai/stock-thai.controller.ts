import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth';
import { StockThaiService } from './stock-thai.service';

@ApiTags('Stock Thai')
@ApiBearerAuth()
@Controller('stock-thai')
@UseGuards(JwtAuthGuard)
export class StockThaiController {
  constructor(private readonly stockThaiService: StockThaiService) {}

  @Get('search')
  @ApiOperation({ summary: 'ค้นหาหุ้นจากชื่อ/symbol' })
  @ApiQuery({ name: 'keyword', example: 'PTT.BK', description: 'ชื่อหุ้นหรือ symbol (ใส่ .BK สำหรับ SET)' })
  @ApiResponse({ status: 200, description: 'Search results from Alpha Vantage' })
  async search(@Query('keyword') keyword: string) {
    return this.stockThaiService.search(keyword);
  }

  @Get('quote')
  @ApiOperation({ summary: 'ดึงราคาหุ้นล่าสุด (Global Quote)' })
  @ApiQuery({ name: 'symbol', example: 'PTT.BK', description: 'Symbol ของหุ้น (ใส่ .BK สำหรับ SET)' })
  @ApiResponse({ status: 200, description: 'Latest quote data' })
  async getQuote(@Query('symbol') symbol: string) {
    return this.stockThaiService.getQuote(symbol);
  }

  @Get('daily')
  @ApiOperation({ summary: 'ดึงราคาหุ้นย้อนหลัง (Daily)' })
  @ApiQuery({ name: 'symbol', example: 'PTT.BK', description: 'Symbol ของหุ้น' })
  @ApiQuery({ name: 'outputSize', required: false, enum: ['compact', 'full'], description: 'compact = 100 วัน, full = 20+ ปี' })
  @ApiResponse({ status: 200, description: 'Daily time series data' })
  async getDailyTimeSeries(
    @Query('symbol') symbol: string,
    @Query('outputSize') outputSize?: 'compact' | 'full',
  ) {
    return this.stockThaiService.getDailyTimeSeries(symbol, outputSize ?? 'compact');
  }
}
