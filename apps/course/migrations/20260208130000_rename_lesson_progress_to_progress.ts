import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameLessonProgressToProgress20260208130000 implements MigrationInterface {
  name = 'RenameLessonProgressToProgress20260208130000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename table
    await queryRunner.query(`ALTER TABLE IF EXISTS lesson_progress RENAME TO progress;`);

    // Rename common indexes
    await queryRunner.query(`ALTER INDEX IF EXISTS idx_lesson_progress_user_id RENAME TO idx_progress_user_id;`);
    await queryRunner.query(`ALTER INDEX IF EXISTS idx_lesson_progress_lesson_id RENAME TO idx_progress_lesson_id;`);
    await queryRunner.query(`ALTER INDEX IF EXISTS uq_lesson_progress_user_lesson RENAME TO uq_progress_user_lesson;`);
    await queryRunner.query(`ALTER INDEX IF EXISTS idx_lesson_progress_map_lesson_id RENAME TO idx_progress_map_lesson_id;`);

    // Rename primary key constraint if exists
    await queryRunner.query(`DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lesson_progress_pkey') THEN
          PERFORM pg_catalog.format('ALTER TABLE %I RENAME CONSTRAINT %I TO %I', 'progress', 'lesson_progress_pkey', 'progress_pkey');
        END IF;
      END
    $$;`);

    // Rename sequence if exists (for SERIAL primary keys)
    await queryRunner.query(`ALTER SEQUENCE IF EXISTS lesson_progress_lesson_progress_id_seq RENAME TO progress_lesson_progress_id_seq;`);

    // Update default nextval for primary column if sequence was renamed
    await queryRunner.query(`DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'progress_lesson_progress_id_seq') THEN
          ALTER TABLE progress ALTER COLUMN lesson_progress_id SET DEFAULT nextval('progress_lesson_progress_id_seq'::regclass);
        END IF;
      END
    $$;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert sequence name if exists
    await queryRunner.query(`ALTER SEQUENCE IF EXISTS progress_lesson_progress_id_seq RENAME TO lesson_progress_lesson_progress_id_seq;`);

    // Revert primary key constraint name if exists
    await queryRunner.query(`DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'progress_pkey') THEN
          PERFORM pg_catalog.format('ALTER TABLE %I RENAME CONSTRAINT %I TO %I', 'progress', 'progress_pkey', 'lesson_progress_pkey');
        END IF;
      END
    $$;`);

    // Revert index names
    await queryRunner.query(`ALTER INDEX IF EXISTS idx_progress_user_id RENAME TO idx_lesson_progress_user_id;`);
    await queryRunner.query(`ALTER INDEX IF EXISTS idx_progress_lesson_id RENAME TO idx_lesson_progress_lesson_id;`);
    await queryRunner.query(`ALTER INDEX IF EXISTS uq_progress_user_lesson RENAME TO uq_lesson_progress_user_lesson;`);
    await queryRunner.query(`ALTER INDEX IF EXISTS idx_progress_map_lesson_id RENAME TO idx_lesson_progress_map_lesson_id;`);

    // Revert table name
    await queryRunner.query(`ALTER TABLE IF EXISTS progress RENAME TO lesson_progress;`);

    // Restore default on column if sequence reverted
    await queryRunner.query(`DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'lesson_progress_lesson_progress_id_seq') THEN
          ALTER TABLE lesson_progress ALTER COLUMN lesson_progress_id SET DEFAULT nextval('lesson_progress_lesson_progress_id_seq'::regclass);
        END IF;
      END
    $$;`);
  }
}
