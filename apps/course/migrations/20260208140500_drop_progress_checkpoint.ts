import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropProgressCheckpoint20260208140500 implements MigrationInterface {
  name = 'DropProgressCheckpoint20260208140500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Backup non-null checkpoint rows to a safekeep table (optional)
    await queryRunner.query(`
      CREATE SCHEMA IF NOT EXISTS backups;
      CREATE TABLE IF NOT EXISTS backups.progress_checkpoint_backup AS
      SELECT lesson_progress_id, user_id, lesson_id, checkpoint, created_at, updated_at
      FROM public.progress
      WHERE checkpoint IS NOT NULL;
    `);

    // Drop the checkpoint column
    await queryRunner.query(`ALTER TABLE public.progress DROP COLUMN IF EXISTS checkpoint;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the checkpoint column
    await queryRunner.query(`ALTER TABLE public.progress ADD COLUMN IF NOT EXISTS checkpoint jsonb;`);

    // Optionally restore backed-up values (skip by default)
    await queryRunner.query(`
      UPDATE public.progress p
      SET checkpoint = b.checkpoint
      FROM backups.progress_checkpoint_backup b
      WHERE p.lesson_progress_id = b.lesson_progress_id;
    `);
  }
}
