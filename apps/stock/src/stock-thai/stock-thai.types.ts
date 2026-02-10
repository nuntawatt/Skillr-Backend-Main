export interface ThaiStockQuote {
  symbol: string;
  price: number;
  change: number;
  percent: number;
  volume: number;
  marketTime: number;
  marketState: string;
}