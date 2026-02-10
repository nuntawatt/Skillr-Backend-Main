import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class FixUserStreakColumns20250210130000 implements MigrationInterface {
  name = 'FixUserStreakColumns20250210130000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_streak'
      );
    `);

    if (tableExists[0].exists) {
      // Add missing columns if they don't exist
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'user_streak' 
            AND column_name = 'last_completed_at'
          ) THEN
            ALTER TABLE user_streak ADD COLUMN last_completed_at TIMESTAMPTZ NULL;
          END IF;
          
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'user_streak' 
            AND column_name = 'created_at'
          ) THEN
            ALTER TABLE user_streak ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
          END IF;
          
          IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'user_streak' 
            AND column_name = 'updated_at'
          ) THEN
            ALTER TABLE user_streak ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
          END IF;
        END $$;
      `);

      // Add unique index if it doesn't exist
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'user_streak' 
            AND indexname = 'uq_user_streak_user'
          ) THEN
            CREATE UNIQUE INDEX uq_user_streak_user ON user_streak (user_id);
          END IF;
        END $$;
      `);
    } else {
      // Create the full table if it doesn't exist
      await queryRunner.query(`
        CREATE TABLE user_streak (
          user_streak_id SERIAL PRIMARY KEY,
          user_id UUID NOT NULL,
          current_streak INTEGER DEFAULT 0,
          longest_streak INTEGER DEFAULT 0,
          last_completed_at TIMESTAMPTZ NULL,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        
        CREATE UNIQUE INDEX uq_user_streak_user ON user_streak (user_id);
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_streak`);
  }
}
