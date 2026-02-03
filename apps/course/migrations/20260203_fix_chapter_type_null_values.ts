import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixChapterTypeNullValues1769370000004 implements MigrationInterface {
  name = 'FixChapterTypeNullValues1769370000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First add the column as nullable
    await queryRunner.query(`
      ALTER TABLE chapters 
      ADD COLUMN IF NOT EXISTS chapter_type varchar(50)
    `);

    // Update NULL values to a default value
    await queryRunner.query(`
      UPDATE chapters 
      SET chapter_type = 'content' 
      WHERE chapter_type IS NULL OR chapter_type = ''
    `);

    // Now set the NOT NULL constraint
    await queryRunner.query(`
      ALTER TABLE chapters 
      ALTER COLUMN chapter_type SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // For rollback, drop the column
    await queryRunner.query(`
      ALTER TABLE chapters 
      DROP COLUMN IF EXISTS chapter_type
    `);
  }
}
