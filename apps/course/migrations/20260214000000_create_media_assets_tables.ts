import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateMediaAssetsTables20260214000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'image_assets',
        columns: [
          { name: 'id', type: 'integer', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'original_filename', type: 'varchar', isNullable: true },
          { name: 'mime_type', type: 'text' },
          { name: 'size_bytes', type: 'bigint' },
          { name: 'storage_provider', type: 'text' },
          { name: 'storage_bucket', type: 'text' },
          { name: 'storage_key', type: 'text' },
          { name: 'status', type: 'enum', enum: ['uploading','ready','failed'], default: "'uploading'" },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'video_assets',
        columns: [
          { name: 'id', type: 'integer', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'owner_user_id', type: 'integer', default: '0' },
          { name: 'original_filename', type: 'varchar', isNullable: true },
          { name: 'mime_type', type: 'text' },
          { name: 'size_bytes', type: 'bigint' },
          { name: 'storage_provider', type: 'text', isNullable: true },
          { name: 'storage_bucket', type: 'text', isNullable: true },
          { name: 'storage_key', type: 'varchar', length: '1024', isNullable: true },
          { name: 'public_url', type: 'varchar', length: '2048', isNullable: true },
          { name: 'status', type: 'enum', enum: ['uploading','processing','ready','failed'], default: "'uploading'" },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('video_assets');
    await queryRunner.dropTable('image_assets');
  }
}
