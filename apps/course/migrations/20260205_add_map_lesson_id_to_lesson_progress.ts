import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMapLessonIdToLessonProgress1760310000000 implements MigrationInterface {
  name = 'AddMapLessonIdToLessonProgress1760310000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE progress
      ADD COLUMN IF NOT EXISTS map_lesson_id INT NULL;
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_progress_map_lesson_id ON progress (map_lesson_id);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_progress_map_lesson_id;`);
    await queryRunner.query(`ALTER TABLE progress DROP COLUMN IF EXISTS map_lesson_id;`);
  }
}
