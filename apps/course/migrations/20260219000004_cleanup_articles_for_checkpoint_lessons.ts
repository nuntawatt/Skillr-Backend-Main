import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanupArticlesForCheckpointLessons20260219000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const lessonsTable = await queryRunner.getTable('lessons');
    const articlesTable = await queryRunner.getTable('articles');
    if (!lessonsTable || !articlesTable) return;

    const hasLessonType = !!lessonsTable.findColumnByName('lesson_type');
    const hasLessonIdLessons = !!lessonsTable.findColumnByName('lesson_id');
    const hasLessonIdArticles = !!articlesTable.findColumnByName('lesson_id');

    if (!hasLessonType || !hasLessonIdLessons || !hasLessonIdArticles) return;

    // If a lesson is type checkpoint, article rows are stale/invalid.
    await queryRunner.query(`
      DELETE FROM "articles" a
      USING "lessons" l
      WHERE a."lesson_id" = l."lesson_id"
        AND l."lesson_type" = 'checkpoint'
    `);
  }

  public async down(): Promise<void> {
    // Data cleanup cannot be reliably reverted.
  }
}
