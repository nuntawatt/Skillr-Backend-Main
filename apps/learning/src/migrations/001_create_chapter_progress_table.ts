import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateChapterProgressTable1640000000001 implements MigrationInterface {
  name = 'CreateChapterProgressTable1640000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'chapter_progress',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'chapter_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'total_items',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'completed_items',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'progress_percentage',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'last_completed_item_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'current_item_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'checkpoint_unlocked',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'chapter_progress',
      new TableIndex({
        name: 'idx_chapter_progress_user_chapter',
        columnNames: ['user_id', 'chapter_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'chapter_progress',
      new TableIndex({
        name: 'idx_chapter_progress_user',
        columnNames: ['user_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('chapter_progress');
  }
}
