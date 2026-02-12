import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRewardShownAtToUserStreak1699228800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'user_streak',
      new TableColumn({
        name: 'reward_shown_at',
        type: 'timestamptz',
        isNullable: true,
        default: null,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('user_streak', 'reward_shown_at');
  }
}
