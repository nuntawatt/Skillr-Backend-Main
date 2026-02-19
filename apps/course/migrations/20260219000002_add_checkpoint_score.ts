import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckpointScore20260219000002 implements MigrationInterface {
  name = 'AddCheckpointScore20260219000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "quizs_checkpoint" ADD COLUMN "checkpoint_score" integer NOT NULL DEFAULT 5',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "quizs_checkpoint" DROP COLUMN "checkpoint_score"');
  }
}
