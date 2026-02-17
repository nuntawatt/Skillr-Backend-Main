import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationsTable1668604800002 implements MigrationInterface {
  name = 'CreateNotificationsTable1668604800002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "notification_id" SERIAL PRIMARY KEY,
        "user_id" UUID NOT NULL,
        "title" VARCHAR(255) NOT NULL,
        "message" TEXT NOT NULL,
        "type" VARCHAR(50) NOT NULL DEFAULT 'info',
        "read_at" TIMESTAMP WITH TIME ZONE,
        "metadata" JSONB,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_notifications_user_id" ON "notifications" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_notifications_read_at" ON "notifications" ("read_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_notifications_created_at" ON "notifications" ("created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notifications"`);
  }
}
