import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterQuizsResultsUserIdToText20260206000000 implements MigrationInterface {
  name = 'AlterQuizsResultsUserIdToText20260206000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quizs_results'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.quizs_results
      ALTER COLUMN user_id TYPE text
      USING user_id::text;
  END IF;
END $$;
    `);

    await queryRunner.query(`
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'quizs_results'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_quizs_results_user_id_lesson_id
    ON public.quizs_results (user_id, lesson_id);
  END IF;
END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reversing to a specific type is unsafe because existing values may be UUID strings.
    // Keep as text.
  }
}
