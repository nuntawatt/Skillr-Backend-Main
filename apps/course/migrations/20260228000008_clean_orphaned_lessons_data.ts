import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanOrphanedLessonsData20260228000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ลบข้อมูล lessons ที่ chapter_id ไม่มีใน chapters table
    const result1 = await queryRunner.query(`
      DELETE FROM lessons 
      WHERE chapter_id NOT IN (SELECT chapter_id FROM chapters)
    `);
    console.log(`✅ Deleted ${result1[1]} orphaned lessons`);

    // ลบข้อมูล chapters ที่ level_id ไม่มีใน levels table
    const result2 = await queryRunner.query(`
      DELETE FROM chapters 
      WHERE level_id NOT IN (SELECT level_id FROM levels)
    `);
    console.log(`✅ Deleted ${result2[1]} orphaned chapters`);

    // ลบข้อมูล levels ที่ course_id ไม่มีใน courses table
    const result3 = await queryRunner.query(`
      DELETE FROM levels 
      WHERE course_id NOT IN (SELECT course_id FROM courses)
    `);
    console.log(`✅ Deleted ${result3[1]} orphaned levels`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ไม่ต้องทำอะไรใน down method
    // เพราะนี่คือการ cleanup ข้อมูลที่ไม่ถูกต้อง
  }
}
