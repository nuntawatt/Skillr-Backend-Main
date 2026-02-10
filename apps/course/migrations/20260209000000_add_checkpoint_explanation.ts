import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckpointExplanation1760572800000 implements MigrationInterface {
  name = 'AddCheckpointExplanation1760572800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'quizs_checkpoint'
        ) THEN
          ALTER TABLE "quizs_checkpoint"
          ADD COLUMN IF NOT EXISTS "checkpoint_explanation" text;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'quizs_checkpoint'
        ) THEN
          ALTER TABLE "quizs_checkpoint"
          DROP COLUMN IF EXISTS "checkpoint_explanation";
        END IF;
      END $$;
    `);
  }
}
