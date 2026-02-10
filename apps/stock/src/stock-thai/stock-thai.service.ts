import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { THAI_STOCKS } from './stock-thai.constants';
import { ThaiStockQuote } from './stock-thai.types';

@Injectable()
export class StockThaiService {
  private readonly logger = new Logger(StockThaiService.name);

  
  async fetchAllQuotes() {
    const results: ThaiStockQuote[] = [];

    for (const symbol of THAI_STOCKS) {
      try {
        const yahooSymbol = `${symbol}.BK`;

        const { data } = await axios.get(
          `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?region=US&lang=en-US&includePrePost=false&interval=2m&useYfid=true&range=1d&corsDomain=finance.yahoo.com&.tsrc=finance`,
          { timeout: 10000 },
        );

        const r = data?.chart?.result?.[0];
        if (!r) continue;

        results.push({
          symbol,
          price: r.meta.regularMarketPrice,
          change: r.meta.regularMarketPrice - r.meta.previousClose,
          percent:
            ((r.meta.regularMarketPrice - r.meta.previousClose) /
              r.meta.previousClose) *
            100,
          time: r.meta.regularMarketTime,
        });
      } catch (e: any) {
        this.logger.warn(`Fail ${symbol}: ${e.message}`);
      }

      // กันโดน block
      await this.delay(300);
    }

    return results;
  }

  private delay(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
