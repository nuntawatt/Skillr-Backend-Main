import {Entity,Column,PrimaryGeneratedColumn,Index} from 'typeorm';

@Entity('stock_thai_price_history')
@Index(['symbol', 'date'], { unique: true })
export class StockThaiHistoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 10 })
  symbol: string;

  @Column({ type: 'timestamptz' })
  date: Date;

  @Column('decimal', { precision: 10, scale: 2 })
  open: number;

  @Column('decimal', { precision: 10, scale: 2 })
  high: number;

  @Column('decimal', { precision: 10, scale: 2 })
  low: number;

  @Column('decimal', { precision: 10, scale: 2 })
  close: number;

  @Column('bigint', { nullable: true })
  volume: number;
}
