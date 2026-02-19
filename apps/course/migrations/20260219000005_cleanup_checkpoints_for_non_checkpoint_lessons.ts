import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanupCheckpointsForNonCheckpointLessons20260219000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const lessonsTable = await queryRunner.getTable('lessons');
    const checkpointTable = await queryRunner.getTable('quizs_checkpoint');
    if (!lessonsTable || !checkpointTable) return;

    const hasLessonType = !!lessonsTable.findColumnByName('lesson_type');
    const hasLessonIdLessons = !!lessonsTable.findColumnByName('lesson_id');
    const hasLessonIdCheckpoint = !!checkpointTable.findColumnByName('lesson_id');

    if (!hasLessonType || !hasLessonIdLessons || !hasLessonIdCheckpoint) return;

    // Remove checkpoints that belong to lessons that are NOT type 'checkpoint'
    await queryRunner.query(`
      DELETE FROM "quizs_checkpoint" qc
      USING "lessons" l
      WHERE qc."lesson_id" = l."lesson_id"
        AND l."lesson_type" <> 'checkpoint'
    `);

    // Also remove orphan checkpoints (lesson row missing)
    await queryRunner.query(`
      DELETE FROM "quizs_checkpoint" qc
      WHERE NOT EXISTS (
        SELECT 1 FROM "lessons" l WHERE l."lesson_id" = qc."lesson_id"
      )
    `);
  }

  public async down(): Promise<void> {
    // Data cleanup cannot be reliably reverted.
  }
}
