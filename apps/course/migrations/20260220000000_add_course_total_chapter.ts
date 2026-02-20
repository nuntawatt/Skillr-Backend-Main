import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCourseTotalChapter20260220000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const coursesTable = await queryRunner.getTable('courses');
    if (!coursesTable) return;

    if (!coursesTable.findColumnByName('course_total_chapter')) {
      await queryRunner.addColumn(
        'courses',
        new TableColumn({
          name: 'course_total_chapter',
          type: 'int',
          isNullable: false,
          default: '0',
        }),
      );
    }

    // Best-effort backfill from existing data
    const levelsTable = await queryRunner.getTable('levels');
    const chaptersTable = await queryRunner.getTable('chapters');
    if (!levelsTable || !chaptersTable) return;

    await queryRunner.query(`
      UPDATE "courses" c
      SET "course_total_chapter" = (
        SELECT COUNT(ch."chapter_id")
        FROM "chapters" ch
        INNER JOIN "levels" l ON l."level_id" = ch."level_id"
        WHERE l."course_id" = c."course_id"
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const coursesTable = await queryRunner.getTable('courses');
    if (!coursesTable) return;

    if (coursesTable.findColumnByName('course_total_chapter')) {
      await queryRunner.dropColumn('courses', 'course_total_chapter');
    }
  }
}
