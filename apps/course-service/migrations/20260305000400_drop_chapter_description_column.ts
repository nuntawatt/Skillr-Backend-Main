import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropChapterDescriptionColumn20260305000400 implements MigrationInterface {
  name = 'DropChapterDescriptionColumn20260305000400';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns c
          WHERE c.table_schema = 'public'
            AND c.table_name = 'chapters'
            AND c.column_name = 'chapter_description'
        ) THEN
          EXECUTE 'ALTER TABLE "chapters" DROP COLUMN "chapter_description"';
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chapters"
      ADD COLUMN IF NOT EXISTS "chapter_description" text;
    `);
  }
}
