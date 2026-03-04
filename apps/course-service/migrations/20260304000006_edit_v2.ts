import { MigrationInterface, QueryRunner } from "typeorm";


export class EditAssetLibrary20260304000006 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {

    // rename table
    await queryRunner.renameTable("image_assets", "image");
    await queryRunner.renameTable("video_assets", "video");

  }

  public async down(queryRunner: QueryRunner): Promise<void> {

    // rollback
    await queryRunner.renameTable("image", "image_assets");
    await queryRunner.renameTable("video", "video_assets");

  }
}