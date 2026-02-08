import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveChapterTypeAddChapterTimestamps20260208000000 implements MigrationInterface {
  name = 'RemoveChapterTypeAddChapterTimestamps20260208000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add timestamps (safe if re-run)
    await queryRunner.query(
      `ALTER TABLE chapters ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE chapters ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`,
    );

    // Drop chapter_type
    await queryRunner.query(`ALTER TABLE chapters DROP COLUMN IF EXISTS chapter_type`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add chapter_type with a default so NOT NULL is satisfiable
    await queryRunner.query(
      `ALTER TABLE chapters ADD COLUMN IF NOT EXISTS chapter_type varchar(50) NOT NULL DEFAULT 'default'`,
    );

    await queryRunner.query(`ALTER TABLE chapters DROP COLUMN IF EXISTS updated_at`);
    await queryRunner.query(`ALTER TABLE chapters DROP COLUMN IF EXISTS created_at`);
  }
}
