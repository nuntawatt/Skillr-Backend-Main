import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixNotificationIdToUuidSimple20260224000001 implements MigrationInterface {
  name = 'FixNotificationIdToUuidSimple20260224000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add a new UUID column first
    await queryRunner.query(`
      ALTER TABLE "notifications" 
      ADD COLUMN "notification_uuid" UUID NOT NULL DEFAULT gen_random_uuid()
    `);

    // Update the existing notification_id column to be UUID type
    // First, drop the primary key constraint
    await queryRunner.query(`
      ALTER TABLE "notifications" DROP CONSTRAINT "notifications_pkey"
    `);

    // Drop the old serial column
    await queryRunner.query(`
      ALTER TABLE "notifications" DROP COLUMN "notification_id"
    `);

    // Rename the UUID column to notification_id
    await queryRunner.query(`
      ALTER TABLE "notifications" RENAME COLUMN "notification_uuid" TO "notification_id"
    `);

    // Add primary key constraint back
    await queryRunner.query(`
      ALTER TABLE "notifications" ADD PRIMARY KEY ("notification_id")
    `);

    // Recreate index
    await queryRunner.query(`
      CREATE INDEX "idx_notifications_notification_id" ON "notifications" ("notification_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse the changes
    await queryRunner.query(`
      ALTER TABLE "notifications" DROP CONSTRAINT "notifications_pkey"
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications" DROP COLUMN "notification_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications" 
      ADD COLUMN "notification_id" SERIAL PRIMARY KEY
    `);
  }
}
