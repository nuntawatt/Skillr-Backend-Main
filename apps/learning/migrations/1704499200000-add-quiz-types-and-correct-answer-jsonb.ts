import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds new quiz question types (match_pairs, correct_order) and
 * converts correct_answer to jsonb to support richer answer shapes.
 */
export class AddQuizTypesAndCorrectAnswerJsonb1704499200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Extend enum with new question types (idempotent with IF NOT EXISTS)
    await queryRunner.query(
      `ALTER TYPE "questions_type_enum" ADD VALUE IF NOT EXISTS 'match_pairs'`,
    );
    await queryRunner.query(
      `ALTER TYPE "questions_type_enum" ADD VALUE IF NOT EXISTS 'correct_order'`,
    );

    // Store correct_answer as jsonb to support arrays/objects
    await queryRunner.query(
      `ALTER TABLE "questions" ALTER COLUMN "correct_answer" TYPE jsonb USING to_jsonb("correct_answer")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert correct_answer back to text
    await queryRunner.query(
      `ALTER TABLE "questions" ALTER COLUMN "correct_answer" TYPE text USING "correct_answer"::text`,
    );

    // Recreate the original enum without the new values
    await queryRunner.query(
      `CREATE TYPE "questions_type_enum_old" AS ENUM ('multiple_choice', 'true_false', 'short_answer')`,
    );
    await queryRunner.query(
      `ALTER TABLE "questions" ALTER COLUMN "type" TYPE "questions_type_enum_old" USING "type"::text::"questions_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "questions_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "questions_type_enum_old" RENAME TO "questions_type_enum"`,
    );
  }
}

