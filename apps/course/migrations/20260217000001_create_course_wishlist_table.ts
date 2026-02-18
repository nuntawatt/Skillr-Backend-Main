import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCourseWishlistTable1668604800001 implements MigrationInterface {
  name = 'CreateCourseWishlistTable1668604800001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "course_wishlist" (
        "wishlist_id" SERIAL PRIMARY KEY,
        "user_id" UUID NOT NULL,
        "course_id" INTEGER NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "uq_course_wishlist_user_course" UNIQUE ("user_id", "course_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_course_wishlist_user_id" ON "course_wishlist" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_course_wishlist_created_at" ON "course_wishlist" ("created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "course_wishlist"`);
  }
}
