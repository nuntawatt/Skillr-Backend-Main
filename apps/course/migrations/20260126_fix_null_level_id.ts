import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixNullLevelId1769370000000 implements MigrationInterface {
  name = 'FixNullLevelId1769370000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // WARNING: this migration sets NULL level_id to fallback 1. Change fallback_id if needed.
    await queryRunner.query(`UPDATE chapters SET level_id = 1 WHERE level_id IS NULL`);

    // After fixing values, set NOT NULL constraint
    await queryRunner.query(`ALTER TABLE chapters ALTER COLUMN level_id SET NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert NOT NULL. We do NOT attempt to restore original NULL values because
    // that data is not tracked by this migration.
    await queryRunner.query(`ALTER TABLE chapters ALTER COLUMN level_id DROP NOT NULL`);
  }
}
