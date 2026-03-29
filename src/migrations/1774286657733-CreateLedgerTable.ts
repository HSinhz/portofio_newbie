import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLedgerTable1774286657733 implements MigrationInterface {
    name = 'CreateLedgerTable1774286657733'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."ledger_entry_type_enum" AS ENUM('DEBIT', 'CREDIT')`);
        await queryRunner.query(`CREATE TYPE "public"."ledger_entry_status_enum" AS ENUM('PENDING', 'COMPLETED', 'REVERSED')`);
        await queryRunner.query(`CREATE TABLE "ledger_entry" ("id" SERIAL NOT NULL, "transaction_id" character varying NOT NULL, "user_id" integer NOT NULL, "order_id" character varying, "type" "public"."ledger_entry_type_enum" NOT NULL, "amount" bigint NOT NULL, "balance_after" bigint NOT NULL, "account" character varying NOT NULL, "description" character varying, "payment_method" character varying, "status" "public"."ledger_entry_status_enum" NOT NULL DEFAULT 'COMPLETED', "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_04e9d274911f909a5848a15cd74" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9ae0dc38388b85b744ec8b2876" ON "ledger_entry" ("transaction_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_5107e42df196889973568bd019" ON "ledger_entry" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_69d3212ac75ea7f10ae829f74c" ON "ledger_entry" ("order_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_69d3212ac75ea7f10ae829f74c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5107e42df196889973568bd019"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9ae0dc38388b85b744ec8b2876"`);
        await queryRunner.query(`DROP TABLE "ledger_entry"`);
        await queryRunner.query(`DROP TYPE "public"."ledger_entry_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."ledger_entry_type_enum"`);
    }

}
