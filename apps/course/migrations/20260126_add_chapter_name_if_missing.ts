import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChapterNameIfMissing1769370000002 implements MigrationInterface {
  name = 'AddChapterNameIfMissing1769370000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add column if missing
    await queryRunner.query(
      `ALTER TABLE chapters ADD COLUMN IF NOT EXISTS chapter_name varchar(100)`,
    );

    // Populate chapter_name from chapter_title for NULL/empty values
    await queryRunner.query(`
      UPDATE chapters
      SET chapter_name = lower(regexp_replace(regexp_replace(coalesce(chapter_title, ''), '[^a-z0-9]+', '-', 'gi'), '(^-|-$)', '', 'g'))
      WHERE chapter_name IS NULL OR chapter_name = '';
    `);

    // Set NOT NULL constraint after data correction
    await queryRunner.query(
      `ALTER TABLE chapters ALTER COLUMN chapter_name SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove column if we want to revert
    await queryRunner.query(
      `ALTER TABLE chapters DROP COLUMN IF EXISTS chapter_name`,
    );
  }
}
