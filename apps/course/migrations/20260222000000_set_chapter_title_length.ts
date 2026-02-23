import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddXpTotalToUserXp20260223000000 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_xp"
      ADD COLUMN "xp_total" integer NOT NULL DEFAULT 0
    `);

    // -- กันเคส row เก่าที่อาจเป็น null (เผื่อ production)
    await queryRunner.query(`
      UPDATE "user_xp"
      SET "xp_total" = 0
      WHERE "xp_total" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_xp"
      DROP COLUMN "xp_total"
    `);
  }

}