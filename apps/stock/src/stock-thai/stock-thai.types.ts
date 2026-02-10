export interface ThaiStockQuote {
  symbol: string;
  price: number;
  change: number;
  percent: number;
  // volume may be large; allow number or string
  volume?: number | string | null;
  // unix timestamp (seconds) or milliseconds — caller should document which one is used
  marketTime: number;
  marketState?: string;
  // optional OHLC if available
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}