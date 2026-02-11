import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCheckpointTable20260211000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create quizs_checkpoint table
    await queryRunner.createTable(
      new Table({
        name: 'quizs_checkpoint',
        columns: [
          {
            name: 'checkpoint_id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'checkpoint_type',
            type: 'enum',
            enum: ['multiple_choice', 'true_false'],
            default: "'multiple_choice'",
          },
          {
            name: 'checkpoint_questions',
            type: 'text',
          },
          {
            name: 'checkpoint_option',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'checkpoint_answer',
            type: 'jsonb',
          },
          {
            name: 'checkpoint_explanation',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'lesson_id',
            type: 'integer',
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

    // Create index on lesson_id for faster lookups
    await queryRunner.createIndex(
      'quizs_checkpoint',
      new TableIndex({
        name: 'IDX_quizs_checkpoint_lesson_id',
        columnNames: ['lesson_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('quizs_checkpoint');
  }
}
