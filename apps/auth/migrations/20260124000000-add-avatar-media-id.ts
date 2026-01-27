import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvatarMediaId20260124000000 implements MigrationInterface {
  name = 'AddAvatarMediaId20260124000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_media_id VARCHAR(255)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS avatar_media_id`);
  }
}
