import { MigrationInterface, QueryRunner } from 'typeorm';

export class DedupeUserStreakAddUniqueIndex20260212090000 implements MigrationInterface {
  name = 'DedupeUserStreakAddUniqueIndex20260212090000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure reward_shown_at column exists
    await queryRunner.query(`ALTER TABLE IF EXISTS user_streak
      ADD COLUMN IF NOT EXISTS reward_shown_at timestamptz NULL;`);

    // Remove duplicate rows, keep the most recently updated row per user_id
    await queryRunner.query(`WITH ranked AS (
        SELECT user_streak_id,
               ROW_NUMBER() OVER (
                 PARTITION BY user_id
                 ORDER BY updated_at DESC, created_at DESC, user_streak_id DESC
               ) AS rn
        FROM user_streak
      )
      DELETE FROM user_streak
      WHERE user_streak_id IN (
        SELECT user_streak_id FROM ranked WHERE rn > 1
      );`);

    // Add unique index to prevent duplicates
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_user_streak_user ON user_streak(user_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_user_streak_user;`);
    // Keep reward_shown_at column (safe to retain)
  }
}
