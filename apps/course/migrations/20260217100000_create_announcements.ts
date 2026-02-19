import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAnnouncements20260217100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'announcements',
        columns: [
          {
            name: 'announcement_id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'image_url',
            type: 'varchar',
            length: '2048',
            isNullable: true,
          },
          {
            name: 'deep_link',
            type: 'varchar',
            length: '2048',
            isNullable: true,
          },
          {
            name: 'active_status',
            type: 'boolean',
            default: true,
          },
          {
            name: 'priority',
            type: 'int',
            default: 0,
          },
          {
            name: 'start_date',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'end_date',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'NOW()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'NOW()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'announcements',
      new TableIndex({
        name: 'idx_announcements_active_priority',
        columnNames: ['active_status', 'priority'],
      }),
    );

    await queryRunner.createIndex(
      'announcements',
      new TableIndex({
        name: 'idx_announcements_date_range',
        columnNames: ['start_date', 'end_date'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('announcements');
  }
}
