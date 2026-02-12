import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTypeAndCheckpointIdToQuizsResults20260212090000
  implements MigrationInterface
{
  name = 'AddTypeAndCheckpointIdToQuizsResults20260212090000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Add enum type for result type (QUIZ/CHECKPOINT)
    await queryRunner.query(`
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quizs_results_type_enum') THEN
    CREATE TYPE quizs_results_type_enum AS ENUM ('QUIZ', 'CHECKPOINT');
  END IF;
END $$;
    `);

    // 2) Add columns
    await queryRunner.query(`
ALTER TABLE public.quizs_results
  ADD COLUMN IF NOT EXISTS type quizs_results_type_enum NOT NULL DEFAULT 'QUIZ',
  ADD COLUMN IF NOT EXISTS checkpoint_id integer NULL;
    `);

    // 3) Drop old unique indexes that prevent multiple checkpoint rows per lesson
    await queryRunner.query(`DROP INDEX IF EXISTS public."IDX_quizs_results_user_lesson";`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.idx_quizs_results_user_id_lesson_id;`);

    // 4) Create correct uniqueness constraints
    //    - Quiz: 1 row per (user_id, lesson_id)
    //    - Checkpoint: 1 row per (user_id, checkpoint_id)
    await queryRunner.query(`
CREATE UNIQUE INDEX IF NOT EXISTS uq_quizs_results_quiz_user_lesson
  ON public.quizs_results (user_id, lesson_id)
  WHERE type = 'QUIZ';
    `);

    await queryRunner.query(`
CREATE UNIQUE INDEX IF NOT EXISTS uq_quizs_results_checkpoint_user_checkpoint
  ON public.quizs_results (user_id, checkpoint_id)
  WHERE type = 'CHECKPOINT';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS public.uq_quizs_results_checkpoint_user_checkpoint;`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.uq_quizs_results_quiz_user_lesson;`);

    await queryRunner.query(`
ALTER TABLE public.quizs_results
  DROP COLUMN IF EXISTS checkpoint_id,
  DROP COLUMN IF EXISTS type;
    `);

    // Keep enum type to avoid unsafe drop in shared environments.
  }
}
