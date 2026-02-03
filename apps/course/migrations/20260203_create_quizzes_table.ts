import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateQuizzesTable1769370000003 implements MigrationInterface {
  name = 'CreateQuizzesTable1769370000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "quizzes" (
        "quiz_id" SERIAL PRIMARY KEY,
        "quiz_title" varchar(255) NOT NULL,
        "quiz_description" text,
        "quiz_type" varchar(50) NOT NULL DEFAULT 'multiple_choice',
        "quiz_status" varchar(50) NOT NULL DEFAULT 'active',
        "quiz_questions" jsonb NOT NULL DEFAULT '[]',
        "show_immediate_feedback" boolean NOT NULL DEFAULT true,
        "allow_retry" boolean NOT NULL DEFAULT true,
        "time_limit" integer,
        "passing_score" integer NOT NULL DEFAULT 70,
        "lesson_id" integer NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_quizzes_lesson_id" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("lesson_id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_quizzes_lesson_id" ON "quizzes" ("lesson_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_quizzes_status" ON "quizzes" ("quiz_status")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_quizzes_type" ON "quizzes" ("quiz_type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_quizzes_type"`);
    await queryRunner.query(`DROP INDEX "idx_quizzes_status"`);
    await queryRunner.query(`DROP INDEX "idx_quizzes_lesson_id"`);
    await queryRunner.query(`DROP TABLE "quizzes"`);
  }
}
