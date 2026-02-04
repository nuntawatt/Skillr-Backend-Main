import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateItemProgressTable1640000000002 implements MigrationInterface {
  name = 'CreateItemProgressTable1640000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'item_progress',
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
            name: 'item_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'chapter_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'locked'",
            isNullable: false,
          },
          {
            name: 'item_type',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'order_index',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'started_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'completed_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'time_spent_seconds',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'quiz_skipped',
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
      'item_progress',
      new TableIndex({
        name: 'idx_item_progress_user_item',
        columnNames: ['user_id', 'item_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'item_progress',
      new TableIndex({
        name: 'idx_item_progress_user_chapter',
        columnNames: ['user_id', 'chapter_id'],
      }),
    );

    await queryRunner.createIndex(
      'item_progress',
      new TableIndex({
        name: 'idx_item_progress_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'item_progress',
      new TableIndex({
        name: 'idx_item_progress_order',
        columnNames: ['chapter_id', 'order_index'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('item_progress');
  }
}
