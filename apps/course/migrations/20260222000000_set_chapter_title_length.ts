import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetChapterTitleLength20260222000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chapters" ALTER COLUMN "chapter_title" TYPE character varying(150)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chapters" ALTER COLUMN "chapter_title" TYPE text`);
  }
}
