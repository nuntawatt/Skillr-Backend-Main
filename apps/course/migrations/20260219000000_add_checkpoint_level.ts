import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckpointLevel20260219000000 implements MigrationInterface {
  name = 'AddCheckpointLevel20260219000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "quizs_checkpoint" ADD COLUMN "checkpoint_level" integer NOT NULL DEFAULT 1',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "quizs_checkpoint" DROP COLUMN "checkpoint_level"');
  }
}
