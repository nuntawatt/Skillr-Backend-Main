import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLessonProgressCheckpoint1760220000000 implements MigrationInterface {
  name = 'AddLessonProgressCheckpoint1760220000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lesson_progress (
        lesson_progress_id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        lesson_id INT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
        progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
        position_seconds INT NULL,
        duration_seconds INT NULL,
        checkpoint JSONB NULL,
        last_viewed_at TIMESTAMPTZ NULL,
        completed_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_lesson_progress_lesson_id
          FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id)
          ON DELETE CASCADE
      );
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_lesson_progress_user_lesson ON lesson_progress (user_id, lesson_id);`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id ON lesson_progress (user_id);`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id ON lesson_progress (lesson_id);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS lesson_progress;`);
  }
}
