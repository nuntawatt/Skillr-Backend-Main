import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStockThaiTables20260210000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.stock_thai_latest (
        symbol varchar(10) PRIMARY KEY,
        price numeric(10,2) NOT NULL,
        change numeric(10,2) NOT NULL,
        percent numeric(6,2) NOT NULL,
        markettime timestamptz NOT NULL,
        updatedat timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.stock_thai_price_history (
        id serial PRIMARY KEY,
        symbol varchar(10) NOT NULL,
        date timestamptz NOT NULL,
        open numeric(10,2) NOT NULL,
        high numeric(10,2) NOT NULL,
        low numeric(10,2) NOT NULL,
        close numeric(10,2) NOT NULL,
        volume bigint,
        CONSTRAINT stock_thai_price_history_symbol_date_unique UNIQUE (symbol, date)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS public.stock_thai_price_history;`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.stock_thai_latest;`);
  }
}
