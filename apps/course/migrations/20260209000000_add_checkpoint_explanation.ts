import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckpointExplanation1760572800000 implements MigrationInterface {
  name = 'AddCheckpointExplanation1760572800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "quizs_checkpoint"
      ADD COLUMN IF NOT EXISTS "checkpoint_explanation" text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "quizs_checkpoint"
      DROP COLUMN IF EXISTS "checkpoint_explanation";
    `);
  }
}
