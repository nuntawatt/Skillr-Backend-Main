import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixNotificationIdToUuid20260224000000 implements MigrationInterface {
  name = 'FixNotificationIdToUuid20260224000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, drop the primary key constraint
    await queryRunner.query(`
      ALTER TABLE "notifications" DROP CONSTRAINT "notifications_pkey"
    `);

    // Drop the old column
    await queryRunner.query(`
      ALTER TABLE "notifications" DROP COLUMN "notification_id"
    `);

    // Add the new UUID column with proper default
    await queryRunner.query(`
      ALTER TABLE "notifications" 
      ADD COLUMN "notification_id" UUID NOT NULL DEFAULT gen_random_uuid()
    `);

    // Add primary key constraint back
    await queryRunner.query(`
      ALTER TABLE "notifications" ADD PRIMARY KEY ("notification_id")
    `);

    // Recreate indexes for the new column
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
