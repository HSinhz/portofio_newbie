// plugins/ledger/ledger.plugin.ts
import { PluginCommonModule, VendurePlugin } from "@vendure/core";
import { LedgerService } from "./ledger.service";
import { LedgerResolver } from "./ledger.resolver";
import { LedgerEntryEntity } from "./entities/ledger-entry.entity";
import { gql } from "graphql-tag";
import { readFileSync } from "fs";
import path from "path";

const schemaFile = readFileSync(path.join(__dirname, "ledger.graphql"), "utf-8");

/**
 * LedgerPlugin
 *
 * Ghi toàn bộ lịch sử tài chính theo double-entry accounting.
 * Mọi thay đổi tiền (payment, refund, wallet top-up...) đều phải
 * đi qua đây → đảm bảo audit trail đầy đủ.
 *
 * Nguyên tắc: KHÔNG XÓA record. Chỉ REVERSE.
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [LedgerEntryEntity],
  providers: [LedgerService],
  exports: [LedgerService],
  shopApiExtensions: {
    schema: gql(schemaFile),
    resolvers: [LedgerResolver],
  },
  compatibility: "^3.0.0",
})
export class LedgerPlugin {}
