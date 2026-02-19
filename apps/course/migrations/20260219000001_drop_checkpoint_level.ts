import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropCheckpointLevel20260219000001 implements MigrationInterface {
  name = 'DropCheckpointLevel20260219000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "quizs_checkpoint" DROP COLUMN IF EXISTS "checkpoint_level"',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "quizs_checkpoint" ADD COLUMN "checkpoint_level" integer NOT NULL DEFAULT 1',
    );
  }
}
