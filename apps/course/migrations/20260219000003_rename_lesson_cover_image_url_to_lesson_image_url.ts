import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RenameLessonCoverImageUrlToLessonImageUrl20260219000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const lessonsTable = await queryRunner.getTable('lessons');
    if (!lessonsTable) return;

    // If the new column already exists, nothing to do.
    if (lessonsTable.findColumnByName('lesson_image_url')) return;

    // Rename common legacy column names to the new one.
    const legacyNames = ['lesson_cover_image_url', 'lesson_ImageUrl', 'lesson_imageUrl'] as const;
    const legacyColumn = legacyNames.find((name) => lessonsTable.findColumnByName(name));

    if (legacyColumn) {
      await queryRunner.renameColumn('lessons', legacyColumn, 'lesson_image_url');
      return;
    }

    // Fallback: ensure the column exists (nullable).
    await queryRunner.addColumn(
      'lessons',
      new TableColumn({
        name: 'lesson_image_url',
        type: 'varchar',
        length: '2048',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const lessonsTable = await queryRunner.getTable('lessons');
    if (!lessonsTable) return;

    // Best-effort revert: rename lesson_image_url back to the legacy lesson_cover_image_url.
    if (lessonsTable.findColumnByName('lesson_image_url') && !lessonsTable.findColumnByName('lesson_cover_image_url')) {
      await queryRunner.renameColumn('lessons', 'lesson_image_url', 'lesson_cover_image_url');
    }
  }
}
