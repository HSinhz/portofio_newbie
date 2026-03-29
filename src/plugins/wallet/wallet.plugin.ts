// plugins/wallet/wallet.plugin.ts
import { PluginCommonModule, VendurePlugin } from "@vendure/core";
import { WalletService } from "./wallet.service";
import { WalletResolver } from "./wallet.resolver";
import { WalletEntity } from "./entities/wallet.entity";
import { gql } from "graphql-tag";
import { readFileSync } from "fs";
import path from "path";

const schemaFile = readFileSync(path.join(__dirname, "wallet.graphql"), "utf-8");

/**
 * WalletPlugin
 *
 * Quản lý số dư nội bộ của user (gift card, Amazon-style balance...).
 * Giao tiếp với LedgerPlugin để ghi mọi biến động số dư.
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [WalletEntity],
  providers: [WalletService],
  exports: [WalletService],
  shopApiExtensions: {
    schema: gql(schemaFile),
    resolvers: [WalletResolver],
  },
  compatibility: "^3.0.0",
})
export class WalletPlugin {}
