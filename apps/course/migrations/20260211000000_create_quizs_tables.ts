import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateQuizsTables20260211000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create quizs table
    await queryRunner.createTable(
      new Table({
        name: 'quizs',
        columns: [
          {
            name: 'quizs_id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'quizs_type',
            type: 'enum',
            enum: ['multiple_choice', 'true_false'],
            default: "'multiple_choice'",
          },
          {
            name: 'quizs_questions',
            type: 'text',
          },
          {
            name: 'quizs_option',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'quizs_answer',
            type: 'jsonb',
          },
          {
            name: 'quizs_explanation',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'lesson_id',
            type: 'integer',
            isUnique: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create quizs_results table
    await queryRunner.createTable(
      new Table({
        name: 'quizs_results',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'user_id',
            type: 'text',
          },
          {
            name: 'lesson_id',
            type: 'integer',
          },
          {
            name: 'user_answer',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'is_correct',
            type: 'boolean',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['PENDING', 'COMPLETED', 'SKIPPED'],
            default: "'PENDING'",
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create unique index on quizs_results
    await queryRunner.createIndex(
      'quizs_results',
      new TableIndex({
        name: 'IDX_quizs_results_user_lesson',
        columnNames: ['user_id', 'lesson_id'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('quizs_results');
    await queryRunner.dropTable('quizs');
  }
}
