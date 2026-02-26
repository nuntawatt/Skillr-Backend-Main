import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsPublishedToLessons20260226030000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false`);
    // lessons table references chapter_id, not course_id — index on chapter_id and is_published
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_lessons_chapter_published ON lessons(chapter_id, is_published)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lessons_chapter_published`);
    await queryRunner.query(`ALTER TABLE lessons DROP COLUMN IF EXISTS is_published`);
  }
}
