import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveRefIdFromLessons20260228000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE lessons DROP COLUMN IF EXISTS ref_id`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE lessons ADD COLUMN ref_id integer`);
  }
}
