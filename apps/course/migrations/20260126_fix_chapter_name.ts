import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixChapterName1769370000001 implements MigrationInterface {
  name = 'FixChapterName1769370000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fill empty or NULL chapter_name with a slug generated from chapter_title
    await queryRunner.query(`
      UPDATE chapters
      SET chapter_name = lower(regexp_replace(regexp_replace(coalesce(chapter_title, ''), '[^a-z0-9]+', '-', 'gi'), '(^-|-$)', '', 'g'))
      WHERE chapter_name IS NULL OR chapter_name = '';
    `);

    // Set NOT NULL constraint after fixing data
    await queryRunner.query(`ALTER TABLE chapters ALTER COLUMN chapter_name SET NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove NOT NULL constraint. We don't attempt to revert generated values.
    await queryRunner.query(`ALTER TABLE chapters ALTER COLUMN chapter_name DROP NOT NULL`);
  }
}