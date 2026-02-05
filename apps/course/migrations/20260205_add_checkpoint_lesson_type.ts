import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckpointLessonType1760310001000 implements MigrationInterface {
  name = 'AddCheckpointLessonType1760310001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // TypeORM default enum name for lessons.lesson_type is usually: lessons_lesson_type_enum
    const enumName = 'lessons_lesson_type_enum';

    await queryRunner.query(`
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = '${enumName}'
      AND e.enumlabel = 'checkpoint'
  ) THEN
    ALTER TYPE "public"."${enumName}" ADD VALUE 'checkpoint';
  END IF;
END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support DROP VALUE for ENUM.
    // Recreate the enum without 'checkpoint'.
    const enumName = 'lessons_lesson_type_enum';
    const tmpEnumName = `${enumName}_tmp`;

    // If any rows use 'checkpoint', downgrade them to 'article' to keep migration reversible.
    await queryRunner.query(
      `UPDATE lessons SET lesson_type = 'article' WHERE lesson_type = 'checkpoint';`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."${tmpEnumName}" AS ENUM ('article', 'video', 'quiz');`,
    );

    await queryRunner.query(`
      ALTER TABLE lessons
      ALTER COLUMN lesson_type
      TYPE "public"."${tmpEnumName}"
      USING lesson_type::text::"public"."${tmpEnumName}";
    `);

    await queryRunner.query(`DROP TYPE "public"."${enumName}";`);
    await queryRunner.query(`ALTER TYPE "public"."${tmpEnumName}" RENAME TO "${enumName}";`);
  }
}
