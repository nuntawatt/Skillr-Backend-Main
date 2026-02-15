import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class StockThaiService {
  private readonly logger = new Logger(StockThaiService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /** ดึง API key จาก env (สลับ key ได้) */
  private getApiKey(): string {
    return (
      this.configService.get<string>('ALPHA_API_KEY3') ??
      this.configService.get<string>('ALPHA_API_KEY4') ??
      this.configService.get<string>('ALPHA_API_KEY5') ??
      ''
    );
  }

  /**
   * ค้นหาหุ้นจากชื่อ/symbol
   */
  async search(keyword: string) {
    const apiKey = this.getApiKey();
    const url = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(keyword)}&apikey=${apiKey}`;

    const { data } = await firstValueFrom(this.httpService.get(url));
    return data;
  }

  /**
   * ดึงราคาหุ้นล่าสุด (Global Quote)
   */
  async getQuote(symbol: string) {
    const apiKey = this.getApiKey();
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;

    const { data } = await firstValueFrom(this.httpService.get(url));
    return data;
  }

  /**
   * ดึงข้อมูลราคาหุ้นย้อนหลัง (Daily)
   */
  async getDailyTimeSeries(symbol: string, outputSize: 'compact' | 'full' = 'compact') {
    const apiKey = this.getApiKey();
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=${outputSize}&apikey=${apiKey}`;

    const { data } = await firstValueFrom(this.httpService.get(url));
    return data;
  }
}
