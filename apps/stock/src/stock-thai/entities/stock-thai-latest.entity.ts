import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('stock_thai_latest')
export class StockThaiLatestEntity {
    @PrimaryColumn({ length: 10 })
    symbol: string;

    @Column('decimal', { precision: 10, scale: 2 })
    price: number;

    @Column('decimal', { precision: 10, scale: 2 })
    change: number;

    @Column('decimal', { precision: 6, scale: 2 })
    percent: number;

    @Column({ type: 'timestamptz' })
    marketTime: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}
