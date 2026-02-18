import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLearnerHomeIndexes1668604800000 implements MigrationInterface {
  name = 'AddLearnerHomeIndexes1668604800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, ensure the lesson_progress table exists
    // If it doesn't exist, create it first
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'lesson_progress'
      );
    `);

    if (!tableExists[0].exists) {
      // Create lesson_progress table if it doesn't exist
      await queryRunner.query(`
        CREATE TABLE "lesson_progress" (
          "id" SERIAL PRIMARY KEY,
          "user_id" UUID NOT NULL,
          "lesson_id" INTEGER NOT NULL,
          "status" VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
          "progress_percent" INTEGER DEFAULT 0,
          "position_seconds" INTEGER DEFAULT 0,
          "duration_seconds" INTEGER DEFAULT 0,
          "last_viewed_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          "completed_at" TIMESTAMP WITH TIME ZONE,
          CONSTRAINT "uq_lesson_progress_user_lesson" UNIQUE ("user_id", "lesson_id")
        )
      `);
    }

    // Now create indexes
    // Index for continue learning - find latest progress per user
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_lesson_progress_user_last_viewed" 
      ON "lesson_progress" ("user_id", "last_viewed_at" DESC)
    `);

    // Index for XP aggregation - sum XP per user
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_user_xp_user_id" 
      ON "user_xp" ("user_id")
    `);

    // Index for course queries - published courses
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_courses_published_created" 
      ON "courses" ("is_published", "created_at" DESC)
    `);

    // Composite index for lesson progress queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_lesson_progress_user_status" 
      ON "lesson_progress" ("user_id", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_lesson_progress_user_last_viewed"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_xp_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_courses_published_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_lesson_progress_user_status"`);
  }
}
