import { MigrationInterface, QueryRunner } from 'typeorm';

const TARGET_TZ = 'Asia/Bangkok';

export class ConvertTimestamptzToTimestampTh20260305000100 implements MigrationInterface {
  name = 'ConvertTimestamptzToTimestampTh20260305000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Convert timestamptz columns in public schema (BASE TABLE only) to timestamp (without time zone)
    // while preserving Thai local time representation.
    //
    // Note: this migration records which columns it converted so down() can revert only those.
    await queryRunner.query(`
      DO $$
      DECLARE r record;
      BEGIN
        CREATE TABLE IF NOT EXISTS public._migration_column_type_conversions (
          table_schema text NOT NULL DEFAULT 'public',
          table_name text NOT NULL,
          column_name text NOT NULL,
          from_type text NOT NULL,
          to_type text NOT NULL,
          migrated_at timestamp NOT NULL DEFAULT now(),
          CONSTRAINT uq_migration_column_type_conversions UNIQUE (table_schema, table_name, column_name, from_type, to_type)
        );

        FOR r IN (
          SELECT c.table_name, c.column_name
          FROM information_schema.columns c
          JOIN information_schema.tables t
            ON t.table_schema = c.table_schema
           AND t.table_name = c.table_name
          WHERE c.table_schema = 'public'
            AND t.table_type = 'BASE TABLE'
            AND c.data_type = 'timestamp with time zone'
            AND c.table_name <> '_migration_column_type_conversions'
        ) LOOP
          EXECUTE format(
            'INSERT INTO public._migration_column_type_conversions (table_name, column_name, from_type, to_type) VALUES (%L, %L, %L, %L) ON CONFLICT DO NOTHING',
            r.table_name,
            r.column_name,
            'timestamptz',
            'timestamp'
          );

          EXECUTE format(
            'ALTER TABLE %I.%I ALTER COLUMN %I TYPE timestamp USING (%I AT TIME ZONE %L)',
            'public',
            r.table_name,
            r.column_name,
            r.column_name,
            '${TARGET_TZ}'
          );
        END LOOP;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Best-effort rollback: reverts only columns converted by up(), assuming values represent Thai local time.
    await queryRunner.query(`
      DO $$
      DECLARE r record;
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables t
          WHERE t.table_schema = 'public'
            AND t.table_name = '_migration_column_type_conversions'
        ) THEN
          FOR r IN (
            SELECT table_name, column_name
            FROM public._migration_column_type_conversions
            WHERE table_schema = 'public'
              AND from_type = 'timestamptz'
              AND to_type = 'timestamp'
          ) LOOP
            EXECUTE format(
              'ALTER TABLE %I.%I ALTER COLUMN %I TYPE timestamptz USING (%I AT TIME ZONE %L)',
              'public',
              r.table_name,
              r.column_name,
              r.column_name,
              '${TARGET_TZ}'
            );
          END LOOP;
        END IF;
      END $$;
    `);
  }
}
