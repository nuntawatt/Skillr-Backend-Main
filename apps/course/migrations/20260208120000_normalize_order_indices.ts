import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeOrderIndices20260208120000 implements MigrationInterface {
  name = 'NormalizeOrderIndices20260208120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Normalize chapters.order_index per level (0..N-1)
    await queryRunner.query(`
      WITH ordered AS (
        SELECT chapter_id, ROW_NUMBER() OVER (PARTITION BY level_id ORDER BY order_index, chapter_id) - 1 AS rn
        FROM chapters
      )
      UPDATE chapters
      SET order_index = ordered.rn
      FROM ordered
      WHERE chapters.chapter_id = ordered.chapter_id;
    `);

    // Normalize lessons.order_index per chapter (0..N-1)
    await queryRunner.query(`
      WITH ordered AS (
        SELECT lesson_id, ROW_NUMBER() OVER (PARTITION BY chapter_id ORDER BY order_index, lesson_id) - 1 AS rn
        FROM lessons
      )
      UPDATE lessons
      SET order_index = ordered.rn
      FROM ordered
      WHERE lessons.lesson_id = ordered.lesson_id;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Attempt to revert to a deterministic ordering by id (may differ from original values)
    await queryRunner.query(`
      WITH ordered AS (
        SELECT chapter_id, ROW_NUMBER() OVER (PARTITION BY level_id ORDER BY chapter_id) - 1 AS rn
        FROM chapters
      )
      UPDATE chapters
      SET order_index = ordered.rn
      FROM ordered
      WHERE chapters.chapter_id = ordered.chapter_id;
    `);

    await queryRunner.query(`
      WITH ordered AS (
        SELECT lesson_id, ROW_NUMBER() OVER (PARTITION BY chapter_id ORDER BY lesson_id) - 1 AS rn
        FROM lessons
      )
      UPDATE lessons
      SET order_index = ordered.rn
      FROM ordered
      WHERE lessons.lesson_id = ordered.lesson_id;
    `);
  }
}