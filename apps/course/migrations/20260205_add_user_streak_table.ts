import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserStreakTable1760304000000 implements MigrationInterface {
  name = 'AddUserStreakTable1760304000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_streak (
        user_streak_id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        current_streak INT NOT NULL DEFAULT 0,
        longest_streak INT NOT NULL DEFAULT 0,
        last_activity_date DATE NULL,
        streak_start_date DATE NULL,
        timezone_offset INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_user_streak_user_id ON user_streak (user_id);`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_user_streak_user_id ON user_streak (user_id);`,
    );

    // Add comment for documentation
    await queryRunner.query(`
      COMMENT ON TABLE user_streak IS 'Tracks user learning streaks for gamification';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN user_streak.current_streak IS 'Current consecutive days of learning activity';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN user_streak.longest_streak IS 'Longest consecutive days achieved by user';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN user_streak.last_activity_date IS 'Date of last learning activity (stored in UTC)';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN user_streak.streak_start_date IS 'Start date of current streak';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN user_streak.timezone_offset IS 'Timezone offset in minutes from UTC for streak calculation';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_streak;`);
  }
}
