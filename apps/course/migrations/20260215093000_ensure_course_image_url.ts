import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class EnsureCourseImageUrl20260215093000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const coursesTable = await queryRunner.getTable('courses');
    if (!coursesTable) return;

    if (!coursesTable.findColumnByName('course_image_url')) {
      await queryRunner.addColumn(
        'courses',
        new TableColumn({
          name: 'course_image_url',
          type: 'varchar',
          length: '2048',
          isNullable: true,
        }),
      );
    }

    // Best-effort backfill: if legacy course_image_id exists and image_assets.public_url exists,
    // set course_image_url from the referenced image asset.
    const refreshedCoursesTable = await queryRunner.getTable('courses');
    const hasLegacyId = !!refreshedCoursesTable?.findColumnByName('course_image_id');

    if (!hasLegacyId) return;

    const imageAssetsTable = await queryRunner.getTable('image_assets');
    const hasPublicUrl = !!imageAssetsTable?.findColumnByName('public_url');

    if (!imageAssetsTable || !hasPublicUrl) return;

    await queryRunner.query(`
      UPDATE "courses" c
      SET "course_image_url" = ia."public_url"
      FROM "image_assets" ia
      WHERE c."course_image_url" IS NULL
        AND c."course_image_id" = ia."id"
        AND ia."public_url" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const coursesTable = await queryRunner.getTable('courses');
    if (coursesTable?.findColumnByName('course_image_url')) {
      await queryRunner.dropColumn('courses', 'course_image_url');
    }
  }
}
