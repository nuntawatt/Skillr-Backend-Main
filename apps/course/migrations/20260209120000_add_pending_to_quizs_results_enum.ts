import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPendingToQuizsResultsEnum20260209120000 implements MigrationInterface {
    name = 'AddPendingToQuizsResultsEnum20260209120000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add 'PENDING' to the enum if it does not exist already
        await queryRunner.query(`
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'quizs_results_status_enum' AND e.enumlabel = 'PENDING'
  ) THEN
    ALTER TYPE quizs_results_status_enum ADD VALUE 'PENDING';
  END IF;
END $$;
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Removing enum values in Postgres is not straightforward and is not done here.
        // Keep down() empty to avoid unsafe operations.
    }
}
