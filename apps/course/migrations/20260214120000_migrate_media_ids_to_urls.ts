import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class MigrateMediaIdsToUrls20260214120000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add public_url column to image_assets table
    const imageTable = await queryRunner.getTable('image_assets');
    if (imageTable && !imageTable.findColumnByName('public_url')) {
      await queryRunner.addColumn(
        'image_assets',
        new TableColumn({
          name: 'public_url',
          type: 'varchar',
          length: '2048',
          isNullable: true,
        }),
      );
    }

    // 2. courses: rename course_image_id → course_image_url (int → varchar)
    const coursesTable = await queryRunner.getTable('courses');
    if (coursesTable?.findColumnByName('course_image_id')) {
      await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN IF EXISTS "course_image_id"`);
      await queryRunner.addColumn(
        'courses',
        new TableColumn({
          name: 'course_image_url',
          type: 'varchar',
          length: '2048',
          isNullable: true,
        }),
      );
    } else if (!coursesTable?.findColumnByName('course_image_url')) {
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

    // 3. lessons: replace lesson_cover_image_id (int) with lesson_cover_image_url (varchar)
    const lessonsTable = await queryRunner.getTable('lessons');
    if (lessonsTable?.findColumnByName('lesson_cover_image_id')) {
      await queryRunner.query(`ALTER TABLE "lessons" DROP COLUMN IF EXISTS "lesson_cover_image_id"`);
    }
    if (!lessonsTable?.findColumnByName('lesson_cover_image_url')) {
      await queryRunner.addColumn(
        'lessons',
        new TableColumn({
          name: 'lesson_cover_image_url',
          type: 'varchar',
          length: '2048',
          isNullable: true,
        }),
      );
    }

    // 4. lessons: replace lesson_video_id (int) with lesson_video_url (varchar)
    if (lessonsTable?.findColumnByName('lesson_video_id')) {
      await queryRunner.query(`ALTER TABLE "lessons" DROP COLUMN IF EXISTS "lesson_video_id"`);
    }
    if (!lessonsTable?.findColumnByName('lesson_video_url')) {
      await queryRunner.addColumn(
        'lessons',
        new TableColumn({
          name: 'lesson_video_url',
          type: 'varchar',
          length: '2048',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert: remove URL columns, add back ID columns

    // image_assets
    const imageTable = await queryRunner.getTable('image_assets');
    if (imageTable?.findColumnByName('public_url')) {
      await queryRunner.dropColumn('image_assets', 'public_url');
    }

    // courses
    const coursesTable = await queryRunner.getTable('courses');
    if (coursesTable?.findColumnByName('course_image_url')) {
      await queryRunner.dropColumn('courses', 'course_image_url');
    }
    if (!coursesTable?.findColumnByName('course_image_id')) {
      await queryRunner.addColumn(
        'courses',
        new TableColumn({
          name: 'course_image_id',
          type: 'integer',
          isNullable: true,
        }),
      );
    }

    // lessons
    const lessonsTable = await queryRunner.getTable('lessons');
    if (lessonsTable?.findColumnByName('lesson_cover_image_url')) {
      await queryRunner.dropColumn('lessons', 'lesson_cover_image_url');
    }
    if (!lessonsTable?.findColumnByName('lesson_cover_image_id')) {
      await queryRunner.addColumn(
        'lessons',
        new TableColumn({
          name: 'lesson_cover_image_id',
          type: 'integer',
          isNullable: true,
        }),
      );
    }

    if (lessonsTable?.findColumnByName('lesson_video_url')) {
      await queryRunner.dropColumn('lessons', 'lesson_video_url');
    }
    if (!lessonsTable?.findColumnByName('lesson_video_id')) {
      await queryRunner.addColumn(
        'lessons',
        new TableColumn({
          name: 'lesson_video_id',
          type: 'integer',
          isNullable: true,
        }),
      );
    }
  }
}
