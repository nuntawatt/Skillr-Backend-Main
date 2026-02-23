import { MigrationInterface, QueryRunner } from "typeorm";

export class FixActiveStatusType20260223120000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. เปลี่ยนกลับเป็น VARCHAR ก่อนเพื่อแก้ไขข้อมูล
    await queryRunner.query(`
      ALTER TABLE announcements 
      ALTER COLUMN active_status TYPE VARCHAR(10)
    `);

    // 2. อัปเดตค่า 'v' และค่าอื่นๆ ให้เป็นค่าที่ถูกต้อง
    await queryRunner.query(`
      UPDATE announcements 
      SET active_status = 'true' 
      WHERE active_status = 'v' OR active_status = 't' OR active_status = 'true'
    `);
    
    await queryRunner.query(`
      UPDATE announcements 
      SET active_status = 'false' 
      WHERE active_status != 'v' AND active_status != 't' AND active_status != 'true' AND active_status IS NOT NULL
    `);

    // 3. จัดการค่า NULL
    await queryRunner.query(`
      UPDATE announcements 
      SET active_status = 'true' 
      WHERE active_status IS NULL
    `);

    // 4. เปลี่ยน data type เป็น BOOLEAN (ตอนนี้ค่าเป็น 'true'/'false' แล้ว)
    await queryRunner.query(`
      ALTER TABLE announcements 
      ALTER COLUMN active_status TYPE BOOLEAN 
      USING active_status::BOOLEAN
    `);

    // 5. ตั้งค่า default เป็น true
    await queryRunner.query(`
      ALTER TABLE announcements 
      ALTER COLUMN active_status SET DEFAULT true
    `);

    // 6. ทำให้ column ไม่รับ NULL
    await queryRunner.query(`
      ALTER TABLE announcements 
      ALTER COLUMN active_status SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback - เปลี่ยนกลับเป็น VARCHAR
    await queryRunner.query(`
      ALTER TABLE announcements 
      ALTER COLUMN active_status TYPE VARCHAR(10)
      USING CASE WHEN active_status = true THEN 'v' ELSE 'f' END
    `);
  }
}
